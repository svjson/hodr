import type {
  FinalizeStepExecution,
  InitialStepExecution,
  MetaJournalEntry,
  StepExecution,
} from '../engine';
import type { Lane } from '../lane';
import type {
  ContextStatus,
  ExecutionContext,
  ExecutionContextParams,
  FinalizeParams,
  OriginId,
} from './types';

export class HodrContext<Payload = unknown> implements ExecutionContext<Payload> {
  origin!: OriginId;

  state: ContextStatus = 'running';

  lane: Lane;
  steps: StepExecution[] = [];
  initialStep!: InitialStepExecution;
  currentStep: StepExecution | null;
  finalizeStep?: FinalizeStepExecution | undefined;

  payload?: Payload;

  metadata: Record<string, any> = {};

  inputTopic!: string;
  outputTopic?: string | undefined;

  constructor(params: ExecutionContextParams) {
    this.origin = params.origin;
    this.lane = params.lane;
    this.initialStep = params.initialStep;
    this.currentStep = params.currentStep;
    this.finalizeStep = params.finalizeStep;
    this.payload = params.payload;
    this.metadata = params.metadata;
    this.inputTopic = params.inputTopic;
    this.outputTopic = params.outputTopic;
  }

  addJournalEntry(entry: MetaJournalEntry): ExecutionContext<Payload> {
    this.currentStep!.metadata.journal.push(entry);
    return this;
  }

  beginFinalizationStep(params: FinalizeParams): FinalizeStepExecution {
    this.finalizeStep = {
      type: 'finalize',
      name: params.name,
      input: params.input,
      metadata: {
        input: { ...params.metadata?.input },
        journal: params.metadata?.journal ?? [],
        output: { ...params.metadata?.output },
      },
      state: params.status,
      startedAt: Date.now(),
    };
    this.currentStep = this.finalizeStep!;
    return this.finalizeStep!;
  }

  terminate(): void {
    if (this.finalizeStep!.state === 'pending') {
      this.finalizeStep!.state = 'finalized';
    }
    this.state = this.finalizeStep!.state;

    this.finalizeStep!.finishedAt = Date.now();
    this.currentStep = null;
  }
}
