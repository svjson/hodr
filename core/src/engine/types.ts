import { ExecutionContext } from '../context';
import { HttpClient } from '../destination';

/**
 * The valid states that an ExecutionStep can have.
 */
export type StepStatus = 'pending' | 'finalized' | 'error';

/**
 * Describes the progress of the execution of a single step of a Lane.
 * Contains the step name, its state, input and output data, metadata, and timestamps
 * and is built up by the execution engine as the step is executed.
 */
export interface StepExecution {
  name: string;
  state: StepStatus;
  input: unknown;
  output?: unknown;
  metadata: StepMetadata;
  startedAt: number;
  finishedAt?: number;
}

/**
 * Makes sure the initalization step identifies itself as such.
 */
export interface InitialStepExecution extends StepExecution {
  type: 'initial';
}

/**
 * Makes sure the finalization won't go around masquerading as a regular step
 * and/or Alex Trebec.
 */
export interface FinalizeStepExecution extends StepExecution {
  type: 'finalize';
}

/**
 * Structured metadata, allowing a step to describe its input/output and details
 * of its execution. Exists to allow more informative in the web inspector and/or
 * theoretically other tooling.
 */
export interface StepMetadata {
  input: { description?: string };
  output: { description?: string };
  journal: MetaJournalEntry[];
}

/**
 * A structured "journal entry" allowing steps to report on the details of their
 * execution. The purpose is for manual inspection of historic executions and should
 * not be relied on for runtime decision-making.
 */
export interface MetaJournalEntry {
  id: string;
  title: string;
  description?: string;
  entry: any;
  typeHint?: string;
}

/**
 * The main - and only - Hodr error type. Meant to be able to carry enough contextual
 * information about errors to produce meaningful log messages, error handling/propagation
 * as well as trouble-shooting actual application errors.
 */
export class HodrError extends Error {
  constructor(
    message: string,
    public readonly contextual: Record<string, any> = {},
    public readonly code: string = 'internal-error',
    public readonly detail?: any,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'HodrError';
  }
}

/**
 * Can't say I remember no At Attin.
 */
export type ObjectPathReference = string | string[];

export interface DestinationAdapter {
  invoke(ctx: ExecutionContext<unknown>, path: string): Promise<any>;
}

/**
 * The mighty and feared HttpClientConfig, consisting of a base URL. Yeah, that's it.
 * For now.
 */
export interface HttpClientConfig {
  baseUrl?: string;
}

/**
 * Factory-function interface or HttpCient plugins.
 */
export type HttpClientProvider = (httpClientConfig: HttpClientConfig) => HttpClient;

export interface HttpClientDestinationAdapter extends DestinationAdapter {}

/**
 * Interface for recording execution contexts.
 *
 * It actually works more like a repository than just a recorder, so this should
 * probably be renamed. Tracker? Repository? It's kind of a log, but let's not overload
 * that term too.
 */
export interface Recorder {
  name: string;

  record(ctx: ExecutionContext<any>): void;

  getRecorded(): ExecutionContext<any>[];
}
