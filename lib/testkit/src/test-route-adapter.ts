import {
  ExecutionContext,
  HodrRoute,
  HttpMethod,
  HttpRequest,
  HttpResponse,
  RouteRequestAdapter,
  StepMetadata,
} from '@hodr/core';

export interface TestRouterContext {
  method: HttpMethod;
  uri: string;
  headers: Record<string, string>;
  params: Record<string, string>;
  session: Record<string, any>;
  response?: HttpResponse;
  body?: any;
}

export const makeRequestContext = (args: {
  method?: HttpMethod;
  uri: string;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  session?: Record<string, any>;
  response?: HttpResponse;
  body?: any;
}): TestRouterContext => {
  return {
    method: 'GET',
    headers: {},
    params: {},
    session: {},
    body: null,
    ...args,
  };
};

export const testRouteAdapter: RouteRequestAdapter<TestRouterContext> = {
  name: 'TestRouter',
  initialStepName: 'test-router-init',
  finalizeStepName: 'test-router-finalize',
  extractRequest: function (ctx: TestRouterContext, route: HodrRoute): HttpRequest {
    return {
      method: route.method,
      uri: route.path,
      params: ctx.params,
      headers: ctx.headers,
      session: ctx.session,
      body: ctx.body,
    };
  },
  buildExecutionMetadata(_1, _2): Record<string, any> {
    return {};
  },
  buildInitialStepMetadata(_1, _2): StepMetadata {
    return {
      input: {},
      output: {},
      journal: [],
    };
  },
  sendResponse: async function (
    ctx: TestRouterContext,
    response: HttpResponse,
    exCtx: ExecutionContext<any>
  ): Promise<void> {
    ctx.response = response;
  },
};
