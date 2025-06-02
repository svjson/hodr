import { HttpRequest } from '../destination';
import { UnitOfWorkBuilder } from '../lane/builder';
import { Input } from '../lane/types';
import { HodrRoute } from './route';
import { Hodr } from '../types';
import {
  HodrRouter,
  HodrRouterErrorFormatterParams,
  HodrRouterFinalizationParams,
} from './types';

/**
 * Router, or rather a builder/configuration collector, for HTTP routes.
 */
export class DefaultHodrRouter implements HodrRouter {
  type = 'Router';
  routes: HodrRoute[];
  finalizePayload = (params: HodrRouterFinalizationParams) => params.payload;
  formatError = (params: HodrRouterErrorFormatterParams) => params.error;

  constructor(
    readonly root: () => Hodr,
    readonly name: string
  ) {
    this.routes = [];
  }

  inputs(): Input[] {
    return this.routes;
  }

  withFinalizePayload(
    finalizeFn: (params: HodrRouterFinalizationParams) => any
  ): HodrRouter {
    this.finalizePayload = finalizeFn;
    return this;
  }

  withErrorFormatter(
    formatterFn: (params: HodrRouterErrorFormatterParams) => any
  ): HodrRouter {
    this.formatError = formatterFn;
    return this;
  }

  get(path: string): UnitOfWorkBuilder<HttpRequest> {
    return this._addRoute('GET', path);
  }

  post(path: string): UnitOfWorkBuilder<HttpRequest> {
    return this._addRoute('POST', path);
  }

  put(path: string): UnitOfWorkBuilder<HttpRequest> {
    return this._addRoute('PUT', path);
  }

  delete(path: string): UnitOfWorkBuilder<HttpRequest> {
    return this._addRoute('DELETE', path);
  }

  private _addRoute(method: string, path: string) {
    const unitOfWork = { root: this.root, steps: [] };
    const route = new HodrRoute(
      this.root,
      method,
      path,
      unitOfWork,
      this.finalizePayload,
      this.formatError
    );
    this.routes.push(route);
    return new UnitOfWorkBuilder<HttpRequest>(unitOfWork);
  }
}
