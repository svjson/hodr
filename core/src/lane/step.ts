import { ExecutionContext } from '../context';
import { HttpRequest, HttpResponse } from '../destination';
import { HodrStep } from './types';

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

// Step for executing arbitrary transformation logic
export class TransformStep<I, T> implements HodrStep<I, T> {
  name = 'transform';

  constructor(private fn: (ctx: ExecutionContext<I>) => Promise<T>) {}

  async execute(ctx: ExecutionContext<I>): Promise<T> {
    return await this.fn(ctx);
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
