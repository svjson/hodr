import { AtomCollection, ExecutionContext } from '../context';
import { extractPath } from '../engine';
import { InternalStatusCode, InternalStatusErrorCode } from '../lane';
import { InternalStatusSuccessCode } from '../lane/types';
import { Hodr } from '../types';
import {
  HttpClient,
  HttpClientConfig,
  HttpClientDestinationAdapter,
  HttpMethods,
  HttpRequest,
  HttpStatusCode,
  HttpStatusErrorCode,
  RequestParameters,
} from './types';

import { compile } from 'path-to-regexp';

export const httpErrorStatusToInternal: Record<
  HttpStatusErrorCode,
  InternalStatusErrorCode
> = {
  400: 'bad-request',
  401: 'unauthorized',
  402: 'payment-required',
  403: 'forbidden',
  404: 'resource-not-found',
  405: 'not-allowed',
  406: 'not-acceptable',
  407: 'proxy-authentication-required',
  408: 'request-timeout',
  409: 'conflict',
  410: 'gone',
  411: 'length-required',
  412: 'precondition-failed',
  413: 'payload-too-large',
  414: 'uri-too-long',
  415: 'unsupported-media-type',
  416: 'range-not-satisfiable',
  417: 'expectation-failed',
  418: 'i-am-a-teapot',
  421: 'misdirected-request',
  422: 'unprocessable-entity',
  423: 'locked',
  424: 'failed-dependency',
  425: 'too-early',
  426: 'upgrade-required',
  428: 'precondition-required',
  429: 'too-many-requests',
  431: 'request-header-fields-too-large',
  451: 'unavailable-for-legal-reasons',
  500: 'internal-error',
  501: 'not-implemented',
  502: 'bad-gateway',
  503: 'service-unavailable',
  504: 'gateway-timeout',
  505: 'http-version-not-supported',
  506: 'variant-also-negotiates',
  507: 'insufficient-storage',
  508: 'loop-detected',
  510: 'not-extended',
  511: 'network-authentication-required',
};

/**
 * These internal status mirror HTTP status codes very much one to one.
 *
 * While the context of a lane might not be http, they should still be
 * expressive enough to describ the status to other kinds of origins,
 * ie a message bus, in which case they would be narrowed down to fit
 * whatever status reporting mechanism they might use.
 *
 * The semantics might change in the future.
 *
 * HttpStatusCode is enumed here to make sure that all defined and supported so
 * far are present in this conversion table.
 */
export const httpStatusToInternal: Record<HttpStatusCode, InternalStatusCode> =
  Object.assign(
    {
      100: 'continue',
      101: 'switching-protocol',
      200: 'ok',
      201: 'created',
      202: 'accepted',
      203: 'non-authorative',
      204: 'no-content',
      205: 'reset-content',
      206: 'partial-content',
      207: 'multi-status',
      208: 'already-reported',
      226: 'im-used',
      300: 'multiple-choices',
      301: 'moved-permanently',
      302: 'found',
      304: 'not-modified',
    } as const,
    httpErrorStatusToInternal
  );

export const errorCodeToHttpStatus: Record<InternalStatusErrorCode, HttpStatusErrorCode> =
  {
    'bad-request': 400,
    unauthorized: 401,
    'payment-required': 402,
    forbidden: 403,
    'resource-not-found': 404,
    'not-allowed': 405,
    'not-acceptable': 406,
    'proxy-authentication-required': 407,
    'request-timeout': 408,
    conflict: 409,
    gone: 410,
    'length-required': 411,
    'precondition-failed': 412,
    'payload-too-large': 413,
    'uri-too-long': 414,
    'unsupported-media-type': 415,
    'range-not-satisfiable': 416,
    'expectation-failed': 417,
    'i-am-a-teapot': 418,
    'misdirected-request': 421,
    'unprocessable-entity': 422,
    locked: 423,
    'failed-dependency': 424,
    'too-early': 425,
    'upgrade-required': 426,
    'precondition-required': 428,
    'too-many-requests': 429,
    'request-header-fields-too-large': 431,
    'unavailable-for-legal-reasons': 451,
    'internal-error': 500,
    'not-implemented': 501,
    'bad-gateway': 502,
    'service-unavailable': 503,
    'gateway-timeout': 504,
    'http-version-not-supported': 505,
    'variant-also-negotiates': 506,
    'insufficient-storage': 507,
    'loop-detected': 508,
    'not-extended': 510,
    'network-authentication-required': 511,
  };

export const successCodeToHttpStatus: Record<InternalStatusSuccessCode, HttpStatusCode> =
  {
    ok: 200,
    created: 201,
    accepted: 202,
    'non-authorative': 203,
    'no-content': 204,
    'reset-content': 205,
    'partial-content': 206,
    'multi-status': 207,
    'already-reported': 208,
    'im-used': 226,
  };

export const internalStatusToHttpStatus: Record<InternalStatusCode, HttpStatusCode> =
  Object.assign(
    {
      continue: 100,
      'switching-protocol': 101,
      'multiple-choices': 300,
      'moved-permanently': 301,
      found: 302,
      'not-modified': 304,
    } as const,
    successCodeToHttpStatus,
    errorCodeToHttpStatus
  );

export const resolveCanonicalHttpStatus = (
  exCtx: ExecutionContext<any>,
  fallback: HttpStatusCode
): HttpStatusCode => {
  const canonicalStatus = exCtx.metadata.canonicalStatus;
  if (canonicalStatus) {
    return (
      canonicalStatus.httpStatus ??
      internalStatusToHttpStatus[canonicalStatus.code as InternalStatusCode]
    );
  }
  return fallback;
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

export const resolveParams = (
  obj: any,
  params: RequestParameters,
  atoms?: AtomCollection
) => {
  const result = Object.assign({}, atoms || {});
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

export const joinUriParts = (...parts: string[]) => {
  return parts
    .filter((part) => part !== '')
    .map((part, index) =>
      index > 0 ? part.replace(/^\/+/, '') : part.replace(/\/+$/, '')
    )
    .join('/');
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
  endpoint: string;
  httpClient: HttpClient;

  constructor(
    private root: () => Hodr,
    private httpClientConfig: HttpClientConfig
  ) {
    if (httpClientConfig.adapter) {
      this.httpClient = httpClientConfig.adapter(this.httpClientConfig);
    } else {
      throw new Error(
        'No HttpClient-implementation provided, and global configuration support is not implemented.'
      );
    }
    this.endpoint = httpClientConfig.endpoint ?? '';
  }


  private async _buildRequest(
    ctx: ExecutionContext<any>,
    path: string,
    reqObj: any,
    params: RequestParameters = { method: 'GET' }
  ): Promise<HttpRequest> {
    let pathParams: Record<string, any>;
    let body: any;

    if (isHttpRequest(reqObj)) {
      pathParams = Object.assign({}, reqObj, reqObj.params ?? {});
      body = reqObj.body;
    } else {
      pathParams = resolveParams(reqObj, params, ctx.atoms());
      body = prepareBody(reqObj, params);
    }

    const uri = compile(path)(pathParams);

    ctx.addJournalEntry({
      id: 'parameterized-uri',
      title: 'Parameterized URI',
      entry: uri,
      typeHint: 'plaintext',
    });

    return {
      method: params.method!,
      uri: compile(joinUriParts(this.endpoint, path))(pathParams),
      body: ['POST', 'PUT', 'PATCH'].includes(params.method!) ? body : null,
    };
  }

  async invoke(
    ctx: ExecutionContext<HttpRequest>,
    path: string,
    params?: RequestParameters
  ): Promise<any> {
    const request: HttpRequest = await this._buildRequest(ctx, path, ctx.payload, params);

    const response = await this.httpClient.request(ctx, request);

    if (response.statusCode >= 200 && response.statusCode < 300) {
      ctx.metadata.canonicalStatus = {
        code: httpStatusToInternal[response.statusCode as HttpStatusCode],
        httpStatus: response.statusCode,
        inferredFrom: 'http-destination',
        inferredBy: ctx.currentStep?.name,
      };
    }

    return response;
  }
}
