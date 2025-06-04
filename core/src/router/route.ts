import { ExecutionContext } from '../context';
import { HodrContext } from '../context/context';
import { HttpRequest } from '../destination';
import { InitialStepExecution, StepExecution } from '../engine';
import { Lane } from '../lane';
import { Hodr } from '../types';
import {
  HodrRoute as HodrRouteInterface,
  HodrRouterErrorFormatterParams,
  HodrRouterFinalizationParams,
} from './types';

/**
 * Describes the lane/unit-of-work associated with an HTTP route, as well as
 * the route specifics.
 */
export class HodrRoute implements HodrRouteInterface {
  name: string;
  type = 'Route';

  constructor(
    readonly root: () => Hodr,
    readonly router: string,
    readonly method: string,
    readonly path: string,
    public lane: Lane,
    public finalizePayload: (params: HodrRouterFinalizationParams) => any,
    public formatError: (params: HodrRouterErrorFormatterParams) => any
  ) {
    this.name = path;
  }

  variant(): string {
    return this.method;
  }

  newExecution(
    request: HttpRequest,
    initialStep: InitialStepExecution,
    metadata?: Record<string, any>
  ): ExecutionContext<HttpRequest> {
    const ctx = new HodrContext<HttpRequest>({
      origin: {
        name: this.router,
        input: this.path,
        variant: this.method,
      },
      lane: this.lane,
      metadata: metadata ?? {},
      initialStep: initialStep,
      currentStep: initialStep,
      payload: request,
      inputTopic: '',
    });

    return ctx;
  }

  /**
   * Execute all registered steps for a request.
   * Does this logic want to to sell the house and move in with the engine module?
   * Yes. Yes, it does.
   */
  async handle(ctx: HodrContext<HttpRequest>): Promise<void> {
    for (const step of this.lane.steps) {
      const execStep: StepExecution = {
        name: step.name,
        input: ctx.payload,
        startedAt: Date.now(),
        metadata: { input: {}, journal: [], output: {} },
        state: 'pending',
      };

      ctx.steps.push(execStep);
      ctx.currentStep = execStep;

      try {
        const stepResult = await step.execute(ctx);
        execStep.finishedAt = Date.now();
        execStep.state = 'finalized';
        execStep.output = stepResult;
        ctx.payload = stepResult;
      } catch (e) {
        execStep.state = 'error';

        const details =
          e instanceof Error
            ? e.stack
              ? {
                  description: e.name,
                  entry: e.stack,
                  typeHint: 'stacktrace',
                }
              : {
                  description: e.name,
                  entry: e.message,
                  typeHint: 'string',
                }
            : {
                description: '',
                entry: String(e),
              };

        ctx.addJournalEntry({
          id: 'error',
          title: 'Error',
          ...details,
        });
        throw e;
      }
    }
  }

  record(ctx: HodrContext<any>) {
    Object.values(this.root().trackers).forEach((tracker) => {
      tracker.record(ctx);
    });
  }
}
