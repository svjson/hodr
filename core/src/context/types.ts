import { FinalizeStepExecution, InitialStepExecution, StepExecution } from '../engine';
import { UnitOfWork } from '../lane';

export interface OriginId {
  name: string;
  input: string;
  variant: string;
}

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
export interface HodrContext<Payload = unknown> {
  origin: OriginId;

  state: 'running' | 'finalized' | 'error';

  /** The execution plan and its runtime state. */
  unit: UnitOfWork;
  steps: StepExecution[];
  initialStep: InitialStepExecution;
  currentStep: StepExecution;
  finalizeStep?: FinalizeStepExecution;

  /** The current state of the main piece of data of an execution */
  payload: Payload;

  /**
   * Anything-goes data-dump for the execution. This is where things that have
   * not yet been feature-ized go. Avoid relying on it if possible. */
  metadata: Record<string, any>;

  /**
   * Description-by-example of the input/origin and execution output. Probably added for
   * the benefit of the Web Inspector.
   *
   * FIXME: clarify semantics.
   * FIXME: Should this simply live in the metadata blob?
   * TODO: Is outputTopic actually even used by anything?
   */
  inputTopic: string;
  outputTopic?: string;
}
