import { ExecutionContext } from '../context';
import { HodrContext } from '../context/context';
import { executeLane, HodrError, InitialStepExecution } from '../engine';
import { Hodr } from '../types';
import { LaneBuilder } from './builder';
import { Input, Lane, Origin } from './types';

export abstract class AbstractInput<T> implements Input<T> {
  abstract type: string;

  constructor(
    readonly name: string,
    readonly originName: string,
    readonly lane: Lane
  ) {}

  abstract variant(): string;

  newExecution(
    initialPayload: T,
    initialStep: InitialStepExecution,
    metadata?: Record<string, any>
  ): ExecutionContext<T> {
    return new HodrContext<T>({
      origin: {
        name: this.originName,
        input: this.name,
        variant: this.variant(),
      },
      lane: this.lane,
      metadata: metadata ?? {},
      initialStep: initialStep,
      currentStep: initialStep,
      payload: initialPayload,
      inputTopic: '',
    });
  }
}

export class ModuleOrigin implements Origin {
  type = 'Module';
  functions: Record<string, FunctionInput> = {};

  constructor(
    readonly root: () => Hodr,
    readonly name: string
  ) {}

  inputs(): Input<any>[] {
    return Object.values(this.functions);
  }

  function(name: string): LaneBuilder {
    const lane = { root: this.root, steps: [] };
    const func = new FunctionInput(this.root, this.name, name, lane);
    this.functions[name] = func;
    return new LaneBuilder(this.root, lane);
  }

  getFunction<I = unknown, O = unknown>(name: string): (arg: I) => O {
    const fnInput = this.functions[name];
    if (!fnInput) {
      throw new HodrError(`No such function: '${name}'`);
    }

    return (arg: I): O => {
      return fnInput.invoke(arg) as O;
    };
  }
}

export class FunctionInput extends AbstractInput<any> {
  type = 'Function';

  constructor(
    readonly root: () => Hodr,
    readonly module: string,
    name: string,
    lane: Lane
  ) {
    super(name, module, lane);
  }

  variant(): string {
    return 'function';
  }

  buildInitialStep<Payload = unknown>(arg: Payload): InitialStepExecution {
    return {
      type: 'initial',
      name: 'function-prepare',
      metadata: { input: {}, output: {}, journal: [] },
      input: arg,
      output: arg,
      startedAt: Date.now(),
      finishedAt: Date.now(),
      state: 'finalized',
    };
  }

  async invoke<T = unknown, R = unknown>(arg: T): Promise<R> {
    const ctx: ExecutionContext<T> = this.newExecution(arg, this.buildInitialStep(arg));
    let thrown: any = null;
    try {
      await executeLane(this.root, ctx);
    } catch (e) {
      thrown = e;
    }

    ctx.beginFinalizationStep({
      name: 'function-finalize',
      status: thrown ? 'error' : 'finalized',
      input: thrown ? HodrError.fromThrown(thrown) : ctx.payload,
    });
    ctx.terminate();

    if (thrown) {
      throw thrown;
    }

    return ctx.payload;
  }
}
