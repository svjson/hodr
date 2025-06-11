import { ExecutionContext } from '../context';
import { HttpRequest } from '../destination';
import { HodrError } from '../engine';
import { Origin } from '../lane';
import { GenericLaneBuilder } from '../lane';
import { HodrRoute } from './route';

export interface HodrRouter extends Origin {
  routes: HodrRoute[];

  finalizePayload(finalizeFn: (params: HodrRouterFinalizationParams) => any): HodrRouter;

  formatError(formatterFn: (params: HodrRouterErrorFormatterParams) => any): HodrRouter;

  get(path: string): GenericLaneBuilder<HttpRequest>;

  post(path: string): GenericLaneBuilder<HttpRequest>;

  put(path: string): GenericLaneBuilder<HttpRequest>;

  delete(path: string): GenericLaneBuilder<HttpRequest>;
}

export interface HodrRouterFinalizationParams {
  ctx: ExecutionContext<any>;
  payload: any;
}

export interface HodrRouterErrorFormatterParams {
  ctx: ExecutionContext<any>;
  error: HodrError;
}
