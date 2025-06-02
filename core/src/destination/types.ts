import { HodrContext } from '../context';

/**
 * A, for now, simplistic interface to be implemented by plugins for any actual
 * HTTP clients.
 */
export interface HttpClient {
  request(ctx: HodrContext<any>, request: Record<string, any>): Promise<HttpResponse>;
}

/**
 * Hodr-abstraction of the components of a HTTP request. Clearly not the full story of
 * HTTP, but will suffice for most shoveling and funneling of data between micro-services.
 *
 * It's not intended to deal with technical aspects of a request - formatting multipart
 * request bodies, making sure content-length matches up with actual content, etc. That's
 * something that actual http client libraries do. This is merely for representing the
 * high-level concerns that are of interest to Hodr.
 */
export interface HttpRequest {
  method: string;
  uri: string;
  headers?: unknown;
  params?: Record<string, string>;
  body?: unknown;
}

/**
 * The counterpart to the HTTPRequest. You may put forth your request and you shall
 * receive a response, though you might not like it.
 */
export interface HttpResponse {
  request?: HttpRequest;
  headers?: unknown;
  statusCode: number;
  body: unknown;
}
