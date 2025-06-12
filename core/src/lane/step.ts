import { AtomCollection, ExecutionContext } from '../context';
import {
  type HttpRequest,
  type HttpResponse,
  type HttpStatusCode,
  HttpStatusErrorCode,
  type RequestParameters,
  errorCodeToHttpStatus,
  httpErrorStatusToInternal,
  httpStatusToInternal,
} from '../destination';
import {
  StatusCondMap,
  ExtractionMap,
  extractMap,
  HodrError,
  executeLane,
} from '../engine';
import { mapStatusCode } from '../engine/transform';
import { Hodr } from '../types';
import {
  EnsurePredicateFunction,
  HodrStep,
  InternalStatusErrorCode,
  Lane,
  TransformFunction,
} from './types';
import { opath, OPathOperation } from '../engine';

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
 * ```
 * .extract({
 *   threadId: 'params',
 *   account: 'session.account',
 *   comment: 'body',
 * })
 * ```
 *
 * Using string/object path expressions:
 * ```
 * .extract('session.account')
 * .extract('comments[id=commentId]')
 * ```
 */
export class ExtractStep<I, T> implements HodrStep<I, T> {
  name = 'extract';

  constructor(readonly directive: ExtractionMap | string) {}

  async execute(ctx: ExecutionContext<I>): Promise<T> {
    const ops: OPathOperation[] = [];

    const result = extractMap(
      ctx.payload,
      this.directive,
      Object.assign({}, ctx.payload, ctx.atoms()),
      (op: OPathOperation) => ops.push(op)
    );

    if (ops.length) {
      ctx.addJournalEntry({
        id: 'extract-comparisons',
        title: 'Extract Comparisons',
        entry: ops.map((op) => ({
          comparison: op.desc,
          result: op.result,
        })),
      });
    }

    return result;
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
        [this.path]: await this.fn(ctx.payload, ctx, ctx.atoms()),
      } as O;
    }

    return await this.fn(ctx.payload, ctx, ctx.atoms());
  }
}

/** Step for enforcing an arbitrary condition by raising an error if not met */
export class EnsureStep<T> implements HodrStep<T, T> {
  name = 'expect';
  internalErrorCode: InternalStatusErrorCode;
  httpErrorCode: HttpStatusErrorCode;
  predicate: EnsurePredicateFunction<T>;

  constructor(
    private root: () => Hodr,
    predicate: EnsurePredicateFunction<T> | string,
    private errorCode: InternalStatusErrorCode | HttpStatusErrorCode,
    name?: string
  ) {
    this.name = name || this.name;

    if (typeof predicate === 'string') {
      const compiled = opath.parseAndCompile(predicate);
      this.predicate = (obj: any, ctx: ExecutionContext<any>, atoms: AtomCollection) => {
        return compiled(obj, Object.assign({}, ctx.payload, atoms), (op) => {
          if (op.type === 'compare') {
            ctx.addJournalEntry({
              id: predicate,
              title: `Expression Comparison: ${predicate}`,
              entry: op,
            });
          }
        });
      };
    } else {
      this.predicate = predicate;
    }

    this.internalErrorCode =
      typeof this.errorCode === 'string'
        ? this.errorCode
        : httpErrorStatusToInternal[this.errorCode];

    this.httpErrorCode =
      typeof this.errorCode === 'string'
        ? errorCodeToHttpStatus[this.errorCode]
        : this.errorCode;
  }

  async execute(ctx: ExecutionContext<T>) {
    const result: boolean = await this.predicate(ctx.payload, ctx, ctx.atoms());
    if (!result) {
      throw new HodrError(
        'Expectation failed!',
        { http: { statusCode: this.httpErrorCode } },
        this.internalErrorCode
      );
    }

    return ctx.payload;
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

/* Step for forking execution into parallel lanes */
export class ParallelStep<I = unknown, O extends readonly any[] = readonly unknown[]>
  implements HodrStep<I, O>
{
  name = 'parallel';

  constructor(
    private root: () => Hodr,
    private lanes: Lane[]
  ) {}

  async execute(ctx: ExecutionContext<I>): Promise<O> {
    const results = await Promise.all(
      this.lanes.map(async (lane) => {
        const subCtx = ctx.fork(lane);
        await executeLane(this.root, subCtx);
        return subCtx.payload;
      })
    );
    return results as any;
  }
}

/* Step for executing a sequence of steps in order */
export class SequenceStep<I, O> implements HodrStep<I, O> {
  name = 'sequence';

  constructor(private steps: HodrStep[]) {}

  async execute(ctx: ExecutionContext<I>): Promise<O> {
    let result = null;
    for (const step of this.steps) {
      result = await step.execute(ctx);
    }
    return result as O;
  }
}

/* Step for re-mapping an HTTP Status code */
export class MapStatusCodeStep implements HodrStep<HttpResponse, HttpResponse> {
  name = 'map-status-code';

  constructor(private statusMap: StatusCondMap) {}

  async execute(ctx: ExecutionContext<HttpResponse>): Promise<HttpResponse> {
    const statusCode = mapStatusCode(ctx.payload.statusCode, this.statusMap);
    ctx.payload.statusCode = statusCode;

    if (ctx.payload?.statusCode >= 200 && ctx.payload?.statusCode < 300) {
      ctx.metadata.canonicalStatus = {
        code: httpStatusToInternal[statusCode as HttpStatusCode],
        httpStatus: statusCode,
        inferredFrom: 'http-status-remap',
        inferredBy: ctx.currentStep?.name,
      };
    }

    return ctx.payload;
  }
}
