import { Context as KoaContext, Middleware } from 'koa';
import send from 'koa-send';
import type {
  EndStateStatus,
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
        toMiddleware(route)
      );
    });
  });
};

/**
 * Finalizes an HTTP request by processing the payload result based on route and configuration
 * or serving up static content.
 *
 * @param {HodrRoute} route - The invoked route, containing configuration for finalizing
 *                            the request.
 * @param {KoaContext} koaContext - The "raw" Koa context for this request.
 * @param {ExecutionContext<any>} exCtx - The execution context containing the payload and metadata.
 */
const finalizeRequest = async (
  route: HodrRoute,
  koaContext: KoaContext,
  exCtx: ExecutionContext<any>
) => {
  exCtx.beginFinalizationStep('koa-plugin-finalize', 'pending', exCtx.payload);

  if (exCtx.metadata?.payloadTypeHint === 'static-content') {
    await send(koaContext, exCtx.payload as unknown as string, {
      root: '/',
    });
  } else {
    koaContext.status = 200;
    koaContext.body = route.finalizePayload({ ctx: exCtx, payload: exCtx.payload });
  }

  terminateCtx(exCtx, koaContext, 'finalized');
};

/**
 * Encodes a request failure into the HTTP response using specified route, context,
 * and execution context rules.
 *
 * @param {HodrRoute} route - The route configuration that provides the error formatting
 *                            method.
 * @param {KoaContext} koaContext - The Koa context for the request, which to encode
 *                                  the response into.
 * @param {ExecutionContext<any>} exCtx - The execution context containing the state and
 *                                        output topic for error handling.
 * @param {any} err - The Error object or message to be encoded into the response.
 */
const encodeErrorResponse = (
  route: HodrRoute,
  koaContext: KoaContext,
  exCtx: ExecutionContext<any>,
  err: any
) => {
  console.error(err);
  koaContext.status = 500;

  const finalizeStep =
    exCtx.finalizeStep ?? exCtx.beginFinalizationStep('koa-plugin-finalize', 'error');
  finalizeStep.state = 'error';

  koaContext.body = route.formatError({
    ctx: exCtx,
    error:
      err instanceof HodrError
        ? err
        : err instanceof Error
          ? new HodrError(err.message, {}, err.name)
          : typeof err === 'string'
            ? new HodrError(err)
            : new HodrError(String(err), {}, 'unknown-error'),
  });

  terminateCtx(exCtx, koaContext, 'error');
};

/**
 * Add final Response metadata and close terminate the execution context.
 *
 * @param {ExecutionContext<any>} exCtx - The execution context to terminate.
 * @param {KoaContext} koaCtx - The Koa context describing the request and response..
 * @param {EndStateStatus} status - The final state of the execution context.
 */
const terminateCtx = (
  exCtx: ExecutionContext<any>,
  koaCtx: KoaContext,
  status: EndStateStatus
): void => {
  exCtx.addJournalEntry({
    id: 'head',
    title: 'HTTP Response Head',
    entry: {
      statusCode: koaCtx.status,
      headers: koaCtx.response.headers,
    },
  });

  exCtx.outputTopic = String(koaCtx.status);

  exCtx.finalizeStep!.output = koaCtx.body;
  exCtx.finalizeStep!.finishedAt = Date.now();
  exCtx.finalizeStep!.metadata.output.description = 'Response Body';

  exCtx.terminate(status);
};

/**
 * Converts a HodrRoute to a Koa Middleware function that initializes an ExecutionContext
 * and executes the route's handler.
 */
const toMiddleware = (route: HodrRoute): Middleware => {
  return async (koaCtx: KoaContext) => {
    const request = buildRequest(koaCtx, route);
    const initialStep = buildInitialStep(koaCtx, request);

    const exCtx: ExecutionContext<HttpRequest> = route.newExecution(request, initialStep, {
      koaCtx: koaCtx,
    });
    exCtx.inputTopic = koaCtx.request.url;

    route.record(exCtx);
    exCtx.initialStep.state = 'finalized';

    try {
      await route.handle(exCtx);
      await finalizeRequest(route, koaCtx, exCtx);
    } catch (err) {
      encodeErrorResponse(route, koaCtx, exCtx, err);
    }
  };
};

/**
 * Translate the KoaContext of a request to a Hodr HttpRequest.
 */
const buildRequest = (koaContext: KoaContext, route: HodrRoute): HttpRequest => {
  return {
    method: route.method,
    uri: route.path,
    headers: koaContext.headers,
    params: koaContext.params,
    session: koaContext.session,
    body: koaContext.request.body,
  };
};

/**
 * Build the initialization step for the route/lane execution.
 *
 * In the context of a Koa-route, this doesn't do much an exists mostly for tracking
 * purposes.
 */
const buildInitialStep = (
  koaContext: KoaContext,
  request: HttpRequest
): InitialStepExecution => {
  return {
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
          entry: koaContext.params,
        },
      ],
    },
    input: koaContext,
    output: request,
    startedAt: Date.now(),
    finishedAt: Date.now(),
    state: 'pending',
  };
};
