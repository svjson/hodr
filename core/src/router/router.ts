import { RouterLaneBuilder } from '../lane/builder';
import { Input } from '../lane/types';
import { Hodr } from '../types';
import { HodrRoute } from './route';
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
  _finalizePayload = (params: HodrRouterFinalizationParams) => params.payload;
  _formatError = (params: HodrRouterErrorFormatterParams) => params.error;

  constructor(
    readonly root: () => Hodr,
    readonly name: string
  ) {
    this.routes = [];
  }

  inputs(): Input<unknown>[] {
    return this.routes;
  }

  finalizePayload(finalizeFn: (params: HodrRouterFinalizationParams) => any): HodrRouter {
    this._finalizePayload = finalizeFn;
    return this;
  }

  formatError(formatterFn: (params: HodrRouterErrorFormatterParams) => any): HodrRouter {
    this._formatError = formatterFn;
    return this;
  }

  get(path: string): RouterLaneBuilder {
    return this._addRoute('GET', path);
  }

  post(path: string): RouterLaneBuilder {
    return this._addRoute('POST', path);
  }

  put(path: string): RouterLaneBuilder {
    return this._addRoute('PUT', path);
  }

  delete(path: string): RouterLaneBuilder {
    return this._addRoute('DELETE', path);
  }

  private _addRoute(method: string, path: string): RouterLaneBuilder {
    const lane = { root: this.root, steps: [] };
    const route = new HodrRoute(
      this.root,
      this.name,
      method,
      path,
      lane,
      this._finalizePayload,
      this._formatError
    );
    this.routes.push(route);
    return new RouterLaneBuilder(this.root, lane);
  }
}
