import { Context as KoaContext, Middleware } from 'koa';
import send from 'koa-send';
import type {
  HodrRoute,
  HodrRouter,
  HodrContext,
  HttpRequest,
  InitialStepExecution,
  FinalizeStepExecution,
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

const beginFinalize = (
  ctx: HodrContext<any>,
  input?: any,
  state: 'pending' | 'finalized' | 'error' = 'pending'
): FinalizeStepExecution => {
  ctx.finalizeStep = {
    type: 'finalize',
    name: 'koa-plugin-finalize',
    input: input,
    metadata: { input: {}, journal: [], output: {} },
    state: state,
    startedAt: Date.now(),
  };

  return ctx.finalizeStep;
};

/**
 * Converts a HodrRoute to a Koa Middleware function that initializes a HodrContext
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

    /**
     * TODO: Should this even be here? Perhaps initalization of the context and
     * execution of a UnitOfWork should just be framework code that's executed the
     * same way, regardless of entry point? I mean, that is/was the whole point, right?
     */
    const hodrCtx: HodrContext<HttpRequest> = {
      origin: {
        name: router.name,
        input: route.path,
        variant: route.method,
      },
      unit: route.unitOfWork,
      steps: [],
      metadata: { koaCtx: koaCtx },
      initialStep: initialStep,
      currentStep: initialStep,
      payload: request,
      inputTopic: koaCtx.request.url,
      state: 'running',
    };

    route.record(hodrCtx);

    try {
      hodrCtx.initialStep.state = 'finalized';
      await route.handle(hodrCtx);

      const finalizeStep = beginFinalize(hodrCtx, hodrCtx.payload);

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
      koaCtx.status = 500;
      hodrCtx.state = 'error';
      hodrCtx.outputTopic = String(koaCtx.status);

      const finalizeStep = hodrCtx.finalizeStep ?? beginFinalize(hodrCtx);
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
