import { ExecutionContext } from '../context';
import { HttpClient, RequestParameters } from '../destination';
import { InternalStatusErrorCode, Usable } from '../lane/types';
import { HttpStatusPattern } from './validate';

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
    public readonly code: InternalStatusErrorCode = 'internal-error',
    public readonly detail?: any,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'HodrError';
  }

  static fromThrown(err: any) {
    return err instanceof HodrError
      ? err
      : err instanceof Error
        ? new HodrError(err.message, {}, 'internal-error', err.name)
        : typeof err === 'string'
          ? new HodrError(err)
          : new HodrError(String(err), {}, 'internal-error');
  }
}

export interface DestinationAdapter<ParamsType = unknown> {
  invoke(ctx: ExecutionContext<unknown>, path: string, params?: ParamsType): Promise<any>;
}

/**
 * Directive for extract operations.
 */
export interface ExtractionMap {
  [key: string]: string | ExtractionMap;
}

/**
 * Directive for status mapping
 */
export type StatusCondEntry = [HttpStatusPattern, number];
export type StatusCondMap = StatusCondEntry[];

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

export interface HttpClientDestinationAdapter
  extends DestinationAdapter<RequestParameters> {}

export interface Validator extends Usable {
  readonly __type: 'validator';
  canValidate(validationType: any): boolean;
  validate<T = unknown>(
    ctx: ExecutionContext<T>,
    validationType: any,
    targetPath?: string
  ): T;
}

/**
 * Interface for recording execution contexts.
 */
export interface Tracker extends Usable {
  readonly __type: 'tracker';
  name: string;

  record(ctx: ExecutionContext<any>): void;

  getRecorded(): ExecutionContext<any>[];
}
