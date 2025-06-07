import {
  ExecutionContext,
  HttpClient,
  HttpClientConfig,
  HttpClientProvider,
  HttpMethod,
  HttpRequest,
  HttpResponse,
} from '@hodr/core';

/**
 * Response configuration for fake HttpClients. See {@link makeFakeHttpClientPlugin}.
 */
export type FakeHttpClientResponses = Record<
  string,
  { [key in HttpMethod]?: HttpResponse | ((req: HttpRequest) => HttpResponse) }
>;

/**
 * Fake HttpClient implementation that responds according to the supplied
 * `FakeHttpClientResponses`. See {@link makeFakeHttpClientPlugin}.
 */
export class FakeHttpClient implements HttpClient {
  constructor(
    private config: HttpClientConfig,
    private responses: FakeHttpClientResponses
  ) {}

  async request(_ctx: ExecutionContext<any>, request: HttpRequest): Promise<HttpResponse> {
    const response = this.responses[request.uri]?.[request.method] ?? {
      statusCode: 404,
      body: { content: {}, _metadata: {} } as any,
      headers: {},
    };

    if (typeof response === 'function') {
      return response(request);
    }

    return response;
  }
}

/**
 * This function generates a simulated HTTP client specifically designed for testing purposes.
 * Although it does not involve real network connections or data transfer, it responds to HTTP
 * requests based on predefined URI and method configurations. If a request does not match any
 * configuration, it will return a standard 404 response.
 *
 * Fake endpoints are configured using a dict of URIs which contain a dict of HTTP Methods.
 * Responses may be a static HttpResponse or a function that takes the incoming HttpRequest
 * and returns a HttpResponse.
 *
 * Usage:
 * ```
 * makeFakeHttpClientPlugin({
 *   '/resource/15': {
 *     GET: { statusCode: 200, body: { id: 15, name: 'The 15th resource!'}},
 *     DELETE: { statusCode: 204, body: {}}
 *   },
 *   '/resource': {
 *     POST: (req) => ({ statusCode: 201, body: { ...req.body, id: 18 }})
 *   }
 * })
 * ```
 */
export const makeFakeHttpClientPlugin = (
  responses: FakeHttpClientResponses
): HttpClientProvider => {
  return (config: HttpClientConfig): HttpClient => new FakeHttpClient(config, responses);
};
