import {
  extractPath,
  type FinalizeStepExecution,
  type InitialStepExecution,
  type MetaJournalEntry,
  type StepExecution,
} from '../engine';
import type { Lane } from '../lane';
import type {
  AtomCollection,
  BaseExecutionContextParams,
  ContextStatus,
  ExecutionContext,
  ExecutionContextParams,
  FinalizeParams,
  OriginId,
} from './types';

/**
 * Base class for execution contexts. This class provides the basic implementation
 * for both main contexts and forked-off sub-contexts.
 */
export abstract class BaseContext<Payload = unknown>
  implements ExecutionContext<Payload>
{
  private _atoms: AtomCollection = {};

  origin: OriginId;
  lane: Lane;
  steps: StepExecution[] = [];

  state: ContextStatus = 'running';
  currentStep: StepExecution | null = null;
  finalizeStep?: FinalizeStepExecution | undefined;

  inputTopic: string = '';
  outputTopic?: string | undefined;
  metadata: Record<string, any>;

  payload: Payload;

  constructor(params: BaseExecutionContextParams<Payload>) {
    this._atoms = params.atoms || {};
    this.origin = params.origin;
    this.lane = params.lane;
    this.currentStep = params.currentStep ?? null;
    this.finalizeStep = params.finalizeStep;
    this.payload = params.payload as Payload;
    this.metadata = params.metadata ?? {};
  }

  atoms(): AtomCollection {
    return this._atoms;
  }

  atom(name: string): any {
    return extractPath(this._atoms, name);
  }

  addJournalEntry(entry: MetaJournalEntry): ExecutionContext<Payload> {
    this.currentStep!.metadata.journal.push(entry);
    return this;
  }

  fork(lane: Lane): ExecutionContext<Payload> {
    const fork = new ExecutionSubContext<Payload>(this, lane);
    this.currentStep!.forks.push(fork.steps);
    return fork;
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
      forks: [],
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

export class HodrContext<Payload = unknown> extends BaseContext<Payload> {
  initialStep: InitialStepExecution;

  constructor(params: ExecutionContextParams<Payload>) {
    super({
      origin: params.origin,
      lane: params.lane,
      finalizeStep: params.finalizeStep,
      payload: params.payload,
      atoms: {},
      currentStep: params.currentStep,
      metadata: params.metadata,
    });

    this.initialStep = params.initialStep;
    this.inputTopic = params.inputTopic ?? '';
    this.outputTopic = params.outputTopic;
  }
}

class ExecutionSubContext<Payload = unknown> extends BaseContext<Payload> {
  constructor(parent: ExecutionContext<Payload>, lane: Lane) {
    super({
      atoms: parent.atoms(),
      origin: parent.origin,
      payload: parent.payload,
      lane: lane,
      metadata: {},
      currentStep: undefined,
    });
  }
}
