import { Hodr } from '../types';
import { ExecutionContext } from '../context';
import { HttpRequest } from '../destination';
import {
  HodrRoute as HodrRouteInterface,
  HodrRouterErrorFormatterParams,
  HodrRouterFinalizationParams,
} from './types';
import { HodrContext } from '../context/context';
import { InitialStepExecution, StepExecution } from '../engine';
import { UnitOfWork } from '../lane';

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
    public unitOfWork: UnitOfWork,
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
      unit: this.unitOfWork,
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
    for (const step of this.unitOfWork.steps) {
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
    Object.values(this.root().recorders).forEach((recorder) => {
      recorder.record(ctx);
    });
  }
}
