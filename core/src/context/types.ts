import {
  FinalizeStepExecution,
  InitialStepExecution,
  StepExecution,
  StepStatus,
} from '../engine';
import { MetaJournalEntry } from '../engine';
import { Lane } from '../lane';

export interface OriginId {
  name: string;
  input: string;
  variant: string;
}

/**
 * Final execution status. All executions will have one of these states when
 * terminated, regardless of success or failure.
 */
export type EndStateStatus = 'finalized' | 'error';

/**
 * Current execution status. Either EndStateStatus or 'running'
 */
export type ContextStatus = 'running' | EndStateStatus;

export interface BaseExecutionContextParams<Payload = unknown> {
  atoms?: AtomCollection;
  origin: OriginId;
  lane: Lane;
  currentStep?: StepExecution;
  finalizeStep?: FinalizeStepExecution;
  /** The current state of the main piece of data of an execution */
  payload?: Payload;
  /**
   * Anything-goes data-dump for the execution. This is where things that have
   * not yet been feature-ized go. Avoid relying on it if possible.
   */
  metadata?: Record<string, any>;
}

export interface ExecutionContextParams<Payload = unknown>
  extends BaseExecutionContextParams<Payload> {
  initialStep: InitialStepExecution;
  /**
   * Description-by-example of the input/origin and execution output. Probably added for
   * the benefit of the Web Inspector.
   *
   * FIXME: clarify semantics.
   * FIXME: Should this simply live in the metadata blob?
   * TODO: Is outputTopic actually even used by anything?
   */
  inputTopic?: string;
  outputTopic?: string;
}

/**
 * Parameters for beginFinalizationStep that initializes the finalizeStep of
 * an execution.
 */
export interface FinalizeParams {
  name: string;
  status: StepStatus;
  input?: any;
  metadata?: Record<string, any>;
}

export type AtomCollection = Record<string, any>;

/**
 * Execution context of a unit of work triggered by an origin (e.g. an HTTP request).
 *
 * Contains the full lifecycle of execution: initialization, step-by-step execution,
 * and finalization. Used and modified by the orchestration engine.
 *
 * ## Structure
 * - **origin**: Who/what started the execution and from where.
 *
 * - **state**: running/finalized/error. Should this be renamed to `status` to avoid
 * confusion with actual detailed state?
 *
 * - **unit**: The "unit of work" assigned to this execution.
 *
 * - **initialStep**: The initialization step performed by the origin implementation
 * that sets up the context for the execution.
 *
 * - **steps**: The performed steps in the execution. The execution runner will
 * populate this as the steps are executed. The execution plan lives
 * in {@link this.unit}
 *
 * - **finalizeStep**: The final step, populated ad performed by the origin, or other
 * terminator of the execution, after all other steps have been executed.
 *
 * - **currentStep**: The currently executing step. And publishing of progres or state
 * by step executors, etc should publish them here.
 *
 * - **payload**: The current state of the data processing of this execution.
 * Is provided as input when a step is initiated, and stored as its output when
 * finalized.
 */
export interface ExecutionContext<Payload> {
  origin: OriginId;
  lane: Lane;

  steps: StepExecution[];
  payload: Payload;
  currentStep: StepExecution | null;

  initialStep?: InitialStepExecution;
  finalizeStep?: FinalizeStepExecution;

  metadata: Record<string, any>;

  inputTopic: string;
  outputTopic?: string;

  atoms(): AtomCollection;
  atom(name: string): any;

  /**
   * Add a journal entry to the metadata section of the current step.
   *
   * Called by steps and collaborators during execution to attach
   * additional log data.
   *
   * @param entry - The journal entry to be added, which contains metadata or log
   * information.
   *
   * @returns self to allow chaining calls.
   */
  addJournalEntry(entry: MetaJournalEntry): ExecutionContext<Payload>;

  /**
   * Fork the execution context to a new lane.
   */
  fork(lane: Lane): ExecutionContext<Payload>;

  /**
   * Enter the finalization step of the execution.
   *
   * This is called by the origin or other terminator of the execution and
   * marks the beginning of the finalization phase.
   *
   * Sets the `finalizationStep` property on this context instance, and assigns
   * it to `currentStep`.
   *
   * @param name - Name to assign to the finalization step
   * @param status - Defaults to 'pending'
   * @param input - Finalization step input
   * @param metada - step metadata
   *
   * @returns The created finalization step.
   */
  beginFinalizationStep(stepData: FinalizeParams): FinalizeStepExecution;

  /**
   * Complete the finalization step of the execution and mark it as no longer
   * executing.
   */
  terminate(): void;
}
