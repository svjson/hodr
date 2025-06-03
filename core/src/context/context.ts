import type {
  InitialStepExecution,
  FinalizeStepExecution,
  MetaJournalEntry,
  StepExecution,
  StepStatus,
} from '../engine';
import type { UnitOfWork } from '../lane';
import type {
  ContextStatus,
  ExecutionContext,
  ExecutionContextParams,
  OriginId,
} from './types';

export class HodrContext<Payload = unknown> implements ExecutionContext<Payload> {
  origin!: OriginId;

  state: ContextStatus = 'running';

  unit!: UnitOfWork;
  steps: StepExecution[] = [];
  initialStep!: InitialStepExecution;
  currentStep!: StepExecution;
  finalizeStep?: FinalizeStepExecution | undefined;

  payload?: Payload;

  metadata: Record<string, any> = {};

  inputTopic!: string;
  outputTopic?: string | undefined;

  constructor(params: ExecutionContextParams) {
    this.origin = params.origin;
    this.unit = params.unit;
    this.initialStep = params.initialStep;
    this.currentStep = params.currentStep;
    this.finalizeStep = params.finalizeStep;
    this.payload = params.payload;
    this.metadata = params.metadata;
    this.inputTopic = params.inputTopic;
    this.outputTopic = params.outputTopic;
  }

  addJournalEntry(entry: MetaJournalEntry): ExecutionContext<Payload> {
    this.currentStep.metadata.journal.push(entry);
    return this;
  }

  beginFinalizationStep(
    stepName: string,
    status: StepStatus = 'pending',
    input?: any
  ): FinalizeStepExecution {
    this.finalizeStep = {
      type: 'finalize',
      name: stepName,
      input: input,
      metadata: { input: {}, journal: [], output: {} },
      state: status,
      startedAt: Date.now(),
    };

    return this.finalizeStep;
  }
}
