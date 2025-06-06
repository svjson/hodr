import { ExecutionContext } from '../context';
import { HodrError } from '../engine';
import { Origin } from '../lane';
import { RouterLaneBuilder } from '../lane/builder';
import { HodrRoute } from './route';

export interface HodrRouter extends Origin {
  routes: HodrRoute[];

  finalizePayload(finalizeFn: (params: HodrRouterFinalizationParams) => any): HodrRouter;

  formatError(formatterFn: (params: HodrRouterErrorFormatterParams) => any): HodrRouter;

  get(path: string): RouterLaneBuilder;

  post(path: string): RouterLaneBuilder;

  put(path: string): RouterLaneBuilder;

  delete(path: string): RouterLaneBuilder;
}

export interface HodrRouterFinalizationParams {
  ctx: ExecutionContext<any>;
  payload: any;
}

export interface HodrRouterErrorFormatterParams {
  ctx: ExecutionContext<any>;
  error: HodrError;
}
