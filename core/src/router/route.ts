import { ExecutionContext } from '../context';
import {
  errorCodeToHttpStatus,
  HttpMethod,
  HttpRequest,
  HttpResponse,
} from '../destination';
import { resolveCanonicalHttpStatus } from '../destination';
import { executeLane, HodrError, InitialStepExecution, StepMetadata } from '../engine';
import { AbstractInput, Lane } from '../lane';
import { Hodr } from '../types';
import { HodrRouterErrorFormatterParams, HodrRouterFinalizationParams } from './types';

/**
 * Describes the lane/unit-of-work associated with an HTTP route, as well as
 * the route specifics.
 */
export class HodrRoute extends AbstractInput<HttpRequest> {
  type = 'Route';

  constructor(
    readonly root: () => Hodr,
    readonly router: string,
    readonly method: HttpMethod,
    readonly path: string,
    public lane: Lane,
    public finalizePayload: (params: HodrRouterFinalizationParams) => any,
    public formatError: (params: HodrRouterErrorFormatterParams) => any
  ) {
    super(path, router, lane);
  }

  variant(): string {
    return this.method;
  }

  /**
   * Build the `InitialStepExecution`, the preparation step of an `ExecutionContext`,
   * using the raw request context and adapter of the router implementation.
   *
   * Part of the `handleRequest` routine.
   */
  private _buildInitialStep<RawCtx>(
    adapter: RouteRequestAdapter<RawCtx>,
    ctx: RawCtx,
    request: HttpRequest
  ): InitialStepExecution {
    const metadata = adapter.buildInitialStepMetadata(ctx, request);

    return {
      type: 'initial',
      name: adapter.initialStepName,
      metadata: {
        input: {
          description: metadata.input?.description ?? `${adapter.name} Context`,
        },
        output: {
          description: metadata.output?.description ?? 'Hodr HTTP Request',
        },
        journal: metadata.journal,
      },
      input: ctx,
      output: request,
      startedAt: Date.now(),
      state: 'pending',
    };
  }

  /**
   * Handle an incoming HTTP request from an actual Router-implementation.
   *
   * Uses `adapter` and the "raw" `ctx` to translate between Hodr's abstractions
   * and those of the Router-implementation.
   *
   * Prepares and initiates the execution of an `ExecutionContext` according to
   * the `Lane` configured for this HodrRoute instance.
   *
   * Ultimately uses `finalizePayload` or `formatError` to finalize the resulting
   * HttpResponse, depending on execution success.
   */
  async handleRequest<RawCtx>(
    ctx: RawCtx,
    adapter: RouteRequestAdapter<RawCtx>
  ): Promise<void> {
    const request = adapter.extractRequest(ctx, this);
    const initialStep = this._buildInitialStep(adapter, ctx, request);
    const exCtx = this.newExecution(
      request,
      initialStep,
      adapter.buildExecutionMetadata(ctx, this)
    );

    exCtx.inputTopic = request.uri;
    exCtx.initialStep.state = 'finalized';
    exCtx.initialStep.finishedAt = Date.now();

    let error: HodrError | null = null;

    try {
      await executeLane(this.root, exCtx);
    } catch (e) {
      error = HodrError.fromThrown(e);
    }

    exCtx.beginFinalizationStep({
      name: adapter.finalizeStepName,
      status: error ? 'error' : 'pending',
      input: error ? error : exCtx.payload,
      metadata: { output: { description: 'Response Body' } },
    });

    const response: HttpResponse = {
      statusCode: error
        ? (errorCodeToHttpStatus[error.code] ?? 500)
        : resolveCanonicalHttpStatus(exCtx, 200),
      body: {},
    };

    try {
      response.body = error
        ? this.formatError({ ctx: exCtx, error: error })
        : this.finalizePayload({ ctx: exCtx, payload: exCtx.payload });
    } catch (e) {
      error = HodrError.fromThrown(e);
      response.body = error;
      exCtx.finalizeStep!.state = 'error';
    }

    await adapter.sendResponse(ctx, response, exCtx);
    exCtx.finalizeStep!.output = response.body;

    exCtx.addJournalEntry({
      id: 'head',
      title: 'HTTP Response Head',
      entry: {
        statusCode: response.statusCode,
        headers: response.headers,
      },
    });

    exCtx.terminate();
  }
}

/**
 * Adapter-interface used by `HodrRoute` to interact with an underlying
 * Router-implementation, translating the incoming request to Hodr's abstraction,
 * and encodes the response back to the Router-implementation.
 */
export interface RouteRequestAdapter<RawCtx> {
  /**
   * The name of the adapted library. Decorative only - is optionally encoded into
   * the metadata of the ExecutionContext, depending on the adapter implementation.
   */
  name: string;
  /**
   * The arbitrary name/id of the initial preparation step of the execution. Does
   * not affect the execution flow and serves no purpose other than giving the step
   * a name for reporting purposes.
   */
  initialStepName: string;
  /**
   * The arbitrary name/id of the finalization step of the execution. Does not affect
   * the execution flow and serves no purpose other than giving the step a name for
   * reporting purposes.
   */
  finalizeStepName: string;
  /**
   * Extract Hodr HttpRequest instance from the request/context-abstraction of the
   * underlying library.
   */
  extractRequest(ctx: RawCtx, route: HodrRoute): HttpRequest;
  /**
   * Build the initial metadata object for the ExecutionContext. Useful for giving
   * access to the raw request/context during execution - particularly during
   * `finalizePayload` or `formatError` if those rely on specifics of the router
   * library.
   */
  buildExecutionMetadata(ctx: RawCtx, route: HodrRoute): Record<string, any>;
  /**
   * Allows the adapter to control the metadata of the initial step of the execution,
   * by providing input/output descriptions or journal entries of adapter-specifics.
   */
  buildInitialStepMetadata(ctx: RawCtx, request: HttpRequest): StepMetadata;
  /**
   * Send or encode the Hodr `HttpResponse` according to the requirements of the
   * underlying library.
   */
  sendResponse(
    ctx: RawCtx,
    response: HttpResponse,
    exCtx: ExecutionContext<any>
  ): Promise<void>;
}
