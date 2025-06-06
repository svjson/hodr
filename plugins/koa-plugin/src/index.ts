import { Context as KoaContext, Middleware } from 'koa';
import send from 'koa-send';
import type {
  ExecutionContext,
  HodrRoute,
  HodrRouter,
  HttpResponse,
  RouteRequestAdapter,
  StepMetadata,
} from '@hodr/core';
import KoaRouter from '@koa/router';

/**
 * Mounts all routes from a HodrRouter instance into a Koa Router.
 * @param koaRouter - The Koa Router instance
 * @param hodrRouter - The Hodr Router to mount
 */
export const mount = (koaRouter: KoaRouter, hodrRouter: HodrRouter | HodrRouter[]) => {
  const routers: HodrRouter[] = Array.isArray(hodrRouter) ? hodrRouter : [hodrRouter];
  routers.forEach((router) => {
    router.routes.forEach((route: HodrRoute) => {
      const handler = koaRouter[route.method.toLowerCase() as keyof KoaRouter];
      if (typeof handler !== 'function') {
        throw new Error(`koaRouter does not support method: ${route.method}`);
      }

      (handler as (path: string, ...middleware: Middleware[]) => KoaRouter).call(
        koaRouter,
        route.path,
        toMiddleware(route)
      );
    });
  });
};

/**
 * Converts a HodrRoute to a Koa Middleware function that initializes an ExecutionContext
 * and executes the route's handler.
 */
const toMiddleware = (route: HodrRoute): Middleware => {
  return async (koaCtx: KoaContext) => {
    await route.handleRequest(koaCtx, koaRequestAdapter);
  };
};

/**
 * Koa-implementation of RouteRequestAdapter, adapting Koa routes and KoaContext to
 * Hodr's route handling implementation.
 */
const koaRequestAdapter: RouteRequestAdapter<KoaContext> = {
  name: 'Koa',
  initialStepName: 'koa-plugin-init',
  finalizeStepName: 'koa-plugin-finalize',
  extractRequest(koaContext, route) {
    return {
      method: route.method,
      uri: route.path,
      headers: koaContext.headers,
      params: koaContext.params,
      session: koaContext.session,
      body: koaContext.request.body,
    };
  },
  buildExecutionMetadata(ctx: KoaContext, _) {
    return { koaCtx: ctx };
  },
  buildInitialStepMetadata: (koaContext: KoaContext, _): StepMetadata => {
    return {
      input: {},
      output: {},
      journal: [
        {
          id: 'koa-request-params',
          title: 'Request Parameters',
          entry: koaContext.params,
        },
      ],
    };
  },
  /**
   * Encodes a Hodr HttpRequest to the Koa Context to be sent as the actual
   * HTTP Response.
   *
   * In the case of static content, response encoding is delegated to `koa-send`.
   */
  sendResponse: async function (
    ctx: KoaContext,
    response: HttpResponse,
    exCtx: ExecutionContext<any>
  ): Promise<void> {
    if (exCtx.metadata?.payloadTypeHint === 'static-content') {
      await send(ctx, exCtx.payload as unknown as string, {
        root: '/',
      });
    } else {
      ctx.status = response.statusCode;
      ctx.body = response.body;
    }
    response.statusCode = ctx.status;
    response.headers = ctx.response.headers;
  },
};
