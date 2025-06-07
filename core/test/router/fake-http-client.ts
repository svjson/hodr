import {
  ExecutionContext,
  HttpClient,
  HttpClientConfig,
  HttpClientProvider,
  HttpMethod,
  HttpRequest,
  HttpResponse,
} from '@hodr/core';

type FakeHttpClientResponses = Record<
  string,
  { [key in HttpMethod]?: HttpResponse | ((req: HttpRequest) => HttpResponse) }
>;

export class FakeHttpClient implements HttpClient {
  constructor(
    private config: HttpClientConfig,
    private responses: FakeHttpClientResponses
  ) {}

  async request(
    _ctx: ExecutionContext<any>,
    request: Record<string, any>
  ): Promise<HttpResponse> {
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

export const makeFakeHttpClientPlugin = (
  responses: FakeHttpClientResponses
): HttpClientProvider => {
  return (config: HttpClientConfig): HttpClient => new FakeHttpClient(config, responses);
};
