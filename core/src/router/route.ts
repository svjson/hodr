import { HodrRoute as HodrRouteInterface } from './types';

/**
 * Describes the lane/unit-of-work associated with an HTTP route, as well as
 * the route specifics.
 */
export class HodrRoute implements HodrRouteInterface {
  name: string;
  type = 'Route';

  constructor(
    readonly root: () => Hodr,
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

        execStep.metadata.journal.push({
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
