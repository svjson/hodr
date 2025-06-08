import { ExecutionContext } from '../context';
import { HodrError } from '../engine';
import { Origin } from '../lane';
import { GenericLaneBuilder } from '../lane';
import { HodrRoute } from './route';

export interface HodrRouter extends Origin {
  routes: HodrRoute[];

  finalizePayload(finalizeFn: (params: HodrRouterFinalizationParams) => any): HodrRouter;

  formatError(formatterFn: (params: HodrRouterErrorFormatterParams) => any): HodrRouter;

  get(path: string): GenericLaneBuilder;

  post(path: string): GenericLaneBuilder;

  put(path: string): GenericLaneBuilder;

  delete(path: string): GenericLaneBuilder;
}

export interface HodrRouterFinalizationParams {
  ctx: ExecutionContext<any>;
  payload: any;
}

export interface HodrRouterErrorFormatterParams {
  ctx: ExecutionContext<any>;
  error: HodrError;
}
