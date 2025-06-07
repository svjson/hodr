import { ExecutionContext } from '../context';
import { extractPath } from '../engine';
import { HttpClientDestinationAdapter } from '../engine/types';
import { Hodr } from '../types';
import { HttpClient, HttpMethods, HttpRequest, RequestParameters } from './types';

import { compile } from 'path-to-regexp';

export const errorCodeToHttpStatus: Record<string, number> = {
  'bad-request': 400,
  unauthorized: 401,
  forbidden: 403,
  'resource-not-found': 404,
  'not-allowed': 405,
  conflict: 409,
  'internal-error': 500,
};

/**
 * This is hopelessly hacky, but will have to do for now.
 */
const isHttpRequest = (obj: any) => {
  return (
    obj.method &&
    HttpMethods.includes(obj.method) &&
    typeof obj.uri === 'string' &&
    (!obj.headers || typeof obj.headers === 'object') &&
    (!obj.session || typeof obj.session === 'object')
  );
};

export const resolveParams = (obj: any, params: RequestParameters) => {
  const result = {};
  if (typeof params.pathParams === 'string') {
    Object.assign(result, extractPath(obj, params.pathParams!) ?? {});
  } else if (typeof params.pathParams === 'object') {
    Object.assign(result, params.pathParams);
  }
  return result;
};

export const prepareBody = (obj: any, params: RequestParameters) => {
  if (typeof params.body === 'string') {
    return extractPath(obj, params.body);
  }

  return obj;
};

/**
 * DestinationAdapter for outgoing HTTP, that accepts either a HttpRequest input
 * or an arbitrary payload that will be shaped into an HttpRequest according to
 * a supplied `RequestParameters` object.
 *
 * Has that one eyesore that breaks the zero-dependency badge of honour, in
 * order to parameterize uri templates. Perhaps it's better to allow the HttpClient-plugin
 * to deal with this - or just roll our own. How hard could it be? It couldn't possibly
 * reach left-pad levels of sheer complexity?
 *
 * On second thought, we'll keep the repsonsibility of parameterizing the URLs, but
 * we'll split the request shaping off into a separate child step for traceability.
 */
export class DefaultHttpClientDestinationAdapter implements HttpClientDestinationAdapter {
  constructor(
    private root: () => Hodr,
    private httpClient: HttpClient
  ) {}

  private async _buildRequest(
    _ctx: ExecutionContext<any>,
    path: string,
    reqObj: any,
    params: RequestParameters = { method: 'GET' }
  ): Promise<HttpRequest> {
    if (isHttpRequest(reqObj)) {
      return {
        ...reqObj,
        uri: compile(path)(Object.assign({}, reqObj, reqObj.params ?? {})),
      };
    }

    const pathParams = resolveParams(reqObj, params);
    const body = prepareBody(reqObj, params);

    return {
      method: params.method!,
      uri: compile(path)(pathParams),
      body: body,
    };
  }

  async invoke(
    ctx: ExecutionContext<HttpRequest>,
    path: string,
    params?: RequestParameters
  ): Promise<any> {
    const request: HttpRequest = await this._buildRequest(ctx, path, ctx.payload, params);

    return await this.httpClient.request(ctx, request);
  }
}
