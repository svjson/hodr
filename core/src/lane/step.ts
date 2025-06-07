import { ExecutionContext } from '../context';
import {
  type HttpRequest,
  type HttpResponse,
  type HttpStatusCode,
  type RequestParameters,
  httpStatusToInternal,
} from '../destination';
import { StatusCondMap, ExtractionMap, extractMap, HodrError } from '../engine';
import { mapStatusCode } from '../engine/transform';
import { Hodr } from '../types';
import { HodrStep, TransformFunction } from './types';

/* Step for calling a named downstream HTTP Destination */
export class CallStep implements HodrStep<HttpRequest, HttpResponse> {
  name = 'call';

  constructor(
    private destination: string,
    private path: string,
    private params?: RequestParameters
  ) {
    this.name = `http-req-${destination}`;
  }

  async execute(ctx: ExecutionContext<HttpRequest>): Promise<HttpResponse> {
    const destination = ctx.lane.root().destinations[this.destination];

    if (!destination) {
      throw new HodrError(`Destination '${this.destination}' has not been configured.`);
    }

    return await destination.invoke(ctx, this.path, this.params);
  }
}

/**
 * Transform the payload by extracting specific fields using a directive map or string.
 *
 * Usage:
 *
 * Using a directive map:
 * .extract({
 *   threadId: 'params',
 *   account: 'session.account',
 *   comment: 'body',
 * })
 *
 * Using a string:
 * .extract('session.account')
 */
export class ExtractStep<I, T> implements HodrStep<I, T> {
  name = 'extract';

  constructor(readonly directive: ExtractionMap | string) {}

  async execute(ctx: ExecutionContext<I>): Promise<T> {
    return extractMap(ctx.payload, this.directive);
  }
}

/** Step for executing arbitrary transformation logic */
export class TransformStep<I, O> implements HodrStep<I, O> {
  name = 'transform';
  path?: string;
  fn: TransformFunction<I, O>;

  constructor(arg1: string | TransformFunction<I, O>, arg2?: TransformFunction<I, O>) {
    if (typeof arg1 == 'function' && arg2 == undefined) {
      this.fn = arg1;
    } else if (typeof arg1 == 'string' && typeof arg2 == 'function') {
      this.path = arg1;
      this.fn = arg2;
    } else {
      throw new HodrError('Invalid transform step configuration.');
    }
  }

  async execute(ctx: ExecutionContext<I>): Promise<O> {
    if (this.path) {
      return {
        ...ctx.payload,
        [this.path]: await this.fn(ctx.payload, ctx),
      };
    }

    return await this.fn(ctx.payload, ctx);
  }
}

/** Step for validating the payload with a validator object */
export class ValidateStep<T> implements HodrStep<T, T> {
  name = 'validate';

  constructor(
    private root: () => Hodr,
    private validatorObject: any,
    private targetPath?: string
  ) {}

  async execute(ctx: ExecutionContext<T>): Promise<T> {
    try {
      if (typeof this.validatorObject === 'function') {
        return this.validatorObject(ctx.payload);
      }

      for (const validator of this.root().validators) {
        if (validator.canValidate(this.validatorObject)) {
          return validator.validate(ctx, this.validatorObject, this.targetPath);
        }
      }
      return ctx.payload;
    } catch (e) {
      /**
       * TODO: We need to keep contextual information about the current payload, for
       * various reasons, but in this case - 'bad-request' (which will translate to 400
       * for http requests) are valid when validating incoming data, but if validation
       * occurs on payload clearly fetched via http or from a database or whatnot, it's
       * something else - an internal error probably. This is important to enforce error
       * semantics in a away that makes sense:
       *
       * "The system should be as predictable in failure as it is in success."
       *   - Confucius
       */
      const error = HodrError.fromThrown(e);
      throw new HodrError(
        error.message,
        error.contextual,
        'bad-request',
        error.detail,
        error.cause ?? error.code
      );
    }
  }
}

type ExtractOutput<S> = S extends HodrStep<any, infer O> ? O : never;

export class ParallelStep<I, S extends readonly HodrStep<I, any>[]>
  implements HodrStep<I, { [K in keyof S]: ExtractOutput<S[K]> }>
{
  name = 'parallel';

  constructor(private steps: S) {}

  async execute(
    ctx: ExecutionContext<I>
  ): Promise<{ [K in keyof S]: ExtractOutput<S[K]> }> {
    const results = await Promise.all(this.steps.map((step) => step.execute(ctx)));
    return results as { [K in keyof S]: ExtractOutput<S[K]> };
  }
}

/* Step for executing a sequence of steps in order */
export class SequenceStep<I, T> implements HodrStep {
  name = 'sequence';

  constructor(private steps: HodrStep[]) {}

  async execute(ctx: ExecutionContext<T>): Promise<void> {
    for (const step of this.steps) {
      await step.execute(ctx);
    }
  }
}

/* Step for re-mapping an HTTP Status code */
export class MapStatusCodeStep implements HodrStep<HttpResponse, HttpResponse> {
  name = 'map-status-code';

  constructor(private statusMap: StatusCondMap) {}

  async execute(ctx: ExecutionContext<HttpResponse>): Promise<HttpResponse> {
    const statusCode = mapStatusCode(ctx.payload!.statusCode, this.statusMap);
    ctx.payload!.statusCode = statusCode;

    if (ctx.payload?.statusCode >= 200 && ctx.payload?.statusCode < 300) {
      ctx.metadata.canonicalStatus = {
        code: httpStatusToInternal[statusCode as HttpStatusCode],
        httpStatus: statusCode,
        inferredFrom: 'http-status-remap',
        inferredBy: ctx.currentStep?.name,
      };
    }

    return ctx.payload!;
  }
}
