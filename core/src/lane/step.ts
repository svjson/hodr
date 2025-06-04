import { ExecutionContext } from '../context';
import { HttpRequest, HttpResponse } from '../destination';
import { extractMap } from '../engine';
import { Hodr } from '../types';
import { ExtractionMap, HodrStep } from './types';

// Step for calling a named downstream service
export class CallStep implements HodrStep<HttpRequest, HttpResponse> {
  name = 'call';

  constructor(
    private service: string,
    private path: string
  ) {
    this.name = `http-req-${service}`;
  }

  async execute(ctx: ExecutionContext<HttpRequest>): Promise<HttpResponse> {
    const service = ctx.lane.root().services[this.service];

    const result = await service.invoke(ctx, this.path);

    return result;
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
export class TransformStep<I, T> implements HodrStep<I, T> {
  name = 'transform';

  constructor(private fn: (ctx: ExecutionContext<I>) => Promise<T>) {}

  async execute(ctx: ExecutionContext<I>): Promise<T> {
    return await this.fn(ctx);
  }
}

/** Step for validating the payload with a validator object */
export class ValidateStep<T> implements HodrStep<T, T> {
  name = 'validate';

  constructor(
    private root: () => Hodr,
    private validatorObject: any
  ) {}

  async execute(ctx: ExecutionContext<T>): Promise<T> {
    for (const validator of this.root().validators) {
      if (validator.canValidate(this.validatorObject)) {
        return validator.validate(ctx, this.validatorObject, ctx.payload);
      }
    }
    return ctx.payload;
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

// Step for executing a sequence of steps in order
export class SequenceStep<I, T> implements HodrStep {
  name = 'sequence';

  constructor(private steps: HodrStep[]) {}

  async execute(ctx: ExecutionContext<T>): Promise<void> {
    for (const step of this.steps) {
      await step.execute(ctx);
    }
  }
}
