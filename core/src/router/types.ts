import { ExecutionContext } from '../context';
import { HttpRequest } from '../destination';
import { HodrError } from '../engine';
import { Origin, Lane, Input } from '../lane';
import { RouterLaneBuilder } from '../lane/builder';
import { Hodr } from '../types';

export interface HodrRouter extends Origin {
  routes: HodrRoute[];

  finalizePayload(finalizeFn: (params: HodrRouterFinalizationParams) => any): HodrRouter;

  formatError(formatterFn: (params: HodrRouterErrorFormatterParams) => any): HodrRouter;

  get(path: string): RouterLaneBuilder;

  post(path: string): RouterLaneBuilder;

  put(path: string): RouterLaneBuilder;

  delete(path: string): RouterLaneBuilder;
}

export interface HodrRoute extends Input<HttpRequest> {
  root(): Hodr;
  readonly method: string;
  readonly path: string;
  lane: Lane;
  finalizePayload: (params: HodrRouterFinalizationParams) => any;
  formatError: (params: HodrRouterErrorFormatterParams) => any;

  handle(ctx: ExecutionContext<HttpRequest>): Promise<void>;
  record(ctx: ExecutionContext<any>): void;
}

export interface HodrRouterFinalizationParams {
  ctx: ExecutionContext<any>;
  payload: any;
}

export interface HodrRouterErrorFormatterParams {
  ctx: ExecutionContext<any>;
  error: HodrError;
}
