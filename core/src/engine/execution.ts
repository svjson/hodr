import { ExecutionContext } from '../context';
import { Hodr } from '../types';
import { StepExecution } from './types';

export const executeLane = async <T = unknown>(
  root: () => Hodr,
  ctx: ExecutionContext<T>
): Promise<void> => {
  root().record(ctx);

  for (const step of ctx.lane.steps) {
    const execStep: StepExecution = {
      name: step.name,
      input: ctx.payload,
      startedAt: Date.now(),
      metadata: { input: {}, journal: [], output: {} },
      state: 'pending',
      forks: [],
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
};
