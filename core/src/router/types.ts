import { HodrContext } from '../context';
import { HttpRequest } from '../destination';
import { HodrError } from '../engine';
import { Origin, UnitOfWork, Input } from '../lane';
import { UnitOfWorkBuilder } from '../lane/builder';
import { Hodr } from '../types';

export interface HodrRouter extends Origin {
  routes: HodrRoute[];

  finalizePayload(finalizeFn: (params: HodrRouterFinalizationParams) => any): HodrRouter;

  formatError(formatterFn: (params: HodrRouterErrorFormatterParams) => any): HodrRouter;

  get(path: string): UnitOfWorkBuilder<HttpRequest>;

  post(path: string): UnitOfWorkBuilder<HttpRequest>;

  put(path: string): UnitOfWorkBuilder<HttpRequest>;

  delete(path: string): UnitOfWorkBuilder<HttpRequest>;
}

export interface HodrRoute extends Input {
  root(): Hodr;
  readonly method: string;
  readonly path: string;
  unitOfWork: UnitOfWork;
  finalizePayload: (params: HodrRouterFinalizationParams) => any;
  formatError: (params: HodrRouterErrorFormatterParams) => any;

  handle(ctx: HodrContext<HttpRequest>): Promise<void>;
  record(ctx: HodrContext<any>): void;
}

export interface HodrRouterFinalizationParams {
  ctx: HodrContext<any>;
  payload: any;
}

export interface HodrRouterErrorFormatterParams {
  ctx: HodrContext<any>;
  error: HodrError;
}
