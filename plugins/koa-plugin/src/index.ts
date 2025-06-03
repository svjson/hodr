import { Context as KoaContext, Middleware } from 'koa';
import send from 'koa-send';
import type {
  ExecutionContext,
  HodrRoute,
  HodrRouter,
  HttpRequest,
  InitialStepExecution,
} from '@hodr/core';
import { HodrError } from '@hodr/core';
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
        toMiddleware(router, route)
      );
    });
  });
};

/**
 * Converts a HodrRoute to a Koa Middleware function that initializes an ExecutionContext
 * and executes the route's handler.
 */
function toMiddleware(router: HodrRouter, route: HodrRoute): Middleware {
  return async (koaCtx: KoaContext) => {
    const request: HttpRequest = {
      method: route.method,
      uri: route.path,
      headers: koaCtx.headers,
      params: koaCtx.params,
      body: koaCtx.request.body,
    };

    const initialStep: InitialStepExecution = {
      type: 'initial',
      name: 'koa-plugin-init',
      metadata: {
        input: {
          description: 'Koa Context',
        },
        output: {
          description: 'Hodr HTTP Request',
        },
        journal: [
          {
            id: 'koa-request-params',
            title: 'Request Parameters',
            entry: koaCtx.params,
          },
        ],
      },
      input: koaCtx,
      output: request,
      startedAt: Date.now(),
      finishedAt: Date.now(),
      state: 'pending',
    };

    const hodrCtx: ExecutionContext<HttpRequest> = route.newExecution(request, initialStep, {
      koaCtx: koaCtx,
    });
    hodrCtx.inputTopic = koaCtx.request.url;

    route.record(hodrCtx);

    try {
      hodrCtx.initialStep.state = 'finalized';
      await route.handle(hodrCtx);

      const finalizeStep = hodrCtx.beginFinalizationStep(
        'koa-plugin-finalize',
        'pending',
        hodrCtx.payload
      );

      if (hodrCtx.metadata?.payloadTypeHint === 'static-content') {
        await send(koaCtx, hodrCtx.payload as unknown as string, {
          root: '/',
        });
      } else {
        koaCtx.status = 200;
        koaCtx.body = route.finalizePayload({ ctx: hodrCtx, payload: hodrCtx.payload });
      }

      hodrCtx.state = 'finalized';
      hodrCtx.outputTopic = String(koaCtx.status);
      finalizeStep.output = koaCtx.body;
      finalizeStep.finishedAt = Date.now();
      finalizeStep.state = 'finalized';
      finalizeStep.metadata.output.description = 'Response Body';
    } catch (err) {
      console.log(err);
      koaCtx.status = 500;
      hodrCtx.state = 'error';
      hodrCtx.outputTopic = String(koaCtx.status);

      const finalizeStep =
        hodrCtx.finalizeStep ?? hodrCtx.beginFinalizationStep('koa-plugin-finalize', 'error');
      finalizeStep.state = 'error';

      koaCtx.body = route.formatError({
        ctx: hodrCtx,
        error:
          err instanceof HodrError
            ? err
            : err instanceof Error
              ? new HodrError(err.message, {}, err.name)
              : typeof err === 'string'
                ? new HodrError(err)
                : new HodrError(String(err), {}, 'unknown-error'),
      });

      finalizeStep.output = koaCtx.body;
    }

    hodrCtx.finalizeStep?.metadata.journal.push({
      id: 'response-status',
      title: 'Response Status Code',
      entry: koaCtx.status,
    });
  };
}
