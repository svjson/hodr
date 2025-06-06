import { ExecutionContext } from '../context';
import { HttpMethod, HttpRequest } from '../destination';
import { executeLane } from '../engine';
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
   * Invoke lane execution with the prepared ExecutionContext
   */
  async handle(ctx: ExecutionContext<HttpRequest>): Promise<void> {
    await executeLane(this.root, ctx);
  }
}
