import { ExecutionContext } from '../context';
import { DestinationAdapter } from '../engine';

/**
 * A, for now, simplistic interface to be implemented by plugins for any actual
 * HTTP clients.
 */
export interface HttpClient {
  request(
    ctx: ExecutionContext<any>,
    request: Record<string, any>
  ): Promise<HttpResponse>;
}

export const HttpMethods = [
  'GET',
  'PUT',
  'POST',
  'DELETE',
  'PATCH',
  'HEAD',
  'OPTIONS',
  'CONNECT',
  'TRACE',
];

export type HttpMethod =
  | 'GET'
  | 'PUT'
  | 'POST'
  | 'DELETE'
  | 'PATCH'
  | 'HEAD'
  | 'OPTIONS'
  | 'CONNECT'
  | 'TRACE';

export type HttpStatusInformationalCode = 100 | 101;

export type HttpStatusSuccessCode =
  | 200
  | 201
  | 202
  | 203
  | 204
  | 205
  | 206
  | 207
  | 208
  | 226;

export type HttpStatusRedirectCode = 300 | 301 | 302 | 304;

export type HttpStatusClientErrorCode =
  | 400
  | 401
  | 402
  | 403
  | 404
  | 405
  | 406
  | 407
  | 408
  | 409
  | 410
  | 411
  | 412
  | 413
  | 414
  | 415
  | 416
  | 417
  | 418
  | 421
  | 422
  | 423
  | 424
  | 425
  | 426
  | 428
  | 429
  | 431
  | 451;

export type HttpStatusServerErrorCode =
  | 500
  | 501
  | 502
  | 503
  | 504
  | 505
  | 506
  | 507
  | 508
  | 510
  | 511;

export type HttpStatusErrorCode = HttpStatusClientErrorCode | HttpStatusServerErrorCode;

export type HttpStatusCode =
  | HttpStatusInformationalCode
  | HttpStatusSuccessCode
  | HttpStatusRedirectCode
  | HttpStatusClientErrorCode
  | HttpStatusServerErrorCode;

export interface RequestParameters {
  method?: HttpMethod;
  pathParams?: Record<string, any> | string;
  body?: Record<string, any> | string;
}

/**
 * Hodr-abstraction of the components of an HTTP request. Clearly not the full story of
 * HTTP, but will suffice for most shoveling and funneling of data between micro-services.
 *
 * It's not intended to deal with technical aspects of a request - formatting multipart
 * request bodies, making sure content-length matches up with actual content, etc. That's
 * something that actual http client libraries do. This is merely for representing the
 * high-level concerns that are of interest to Hodr.
 */
export interface HttpRequest {
  method: HttpMethod;
  uri: string;
  uriTemplate?: string;
  headers?: unknown;
  session?: { [key: PropertyKey]: any };
  params?: Record<string, string>;
  body?: any;
}

/**
 * The counterpart to the HTTPRequest. You may put forth your request and you shall
 * receive a response, though you might not like it.
 */
export interface HttpResponse {
  request?: HttpRequest;
  headers?: unknown;
  statusCode: HttpStatusCode;
  body: unknown;
}

/**
 * Configuration or Http Client Destinations.
 *
 * @param baseUrl - The protocol, host, port and optionally root uri for the remote API.
 * @param endpoint - The root context for a particular Destination. May contain placeholders.
 * @param adapter - The HttpClient plugin/provider. Required unless configured on application-wide.
 */
export interface HttpClientConfig {
  baseUrl?: string;
  endpoint?: string;
  adapter?: HttpClientProvider;
}

/**
 * Factory-function interface or HttpCient plugins.
 */
export type HttpClientProvider = (httpClientConfig: HttpClientConfig) => HttpClient;

export interface HttpClientDestinationAdapter
  extends DestinationAdapter<RequestParameters> {}
