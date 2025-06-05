import axios, { AxiosError, AxiosStatic } from 'axios';
import {
  type ExecutionContext,
  type HttpClient,
  type HttpClientConfig,
  type HttpResponse,
  type HttpClientProvider,
  HodrError,
} from '@hodr/core';

export const AxiosPlugin: HttpClientProvider = (
  httpClientConfig: HttpClientConfig
): HttpClient => {
  return new AxiosHttpClient(axios, httpClientConfig);
};

class AxiosHttpClient implements HttpClient {
  constructor(
    private axios: AxiosStatic,
    private httpClientConfig: HttpClientConfig
  ) {}

  async request(
    ctx: ExecutionContext<any>,
    request: Record<string, any>
  ): Promise<HttpResponse> {
    try {
      const req = {
        method: request.method,
        url: `${this.httpClientConfig.baseUrl ?? ''}/${request.uri}`,
        data: ['POST', 'PUT'].includes(request.method) ? request.body : undefined,
      };

      ctx.addJournalEntry({
        id: 'axios-request-args',
        title: 'Axios Request Arguments',
        description: 'As passed to axios.request()',
        entry: req,
      });

      const response = await this.axios.request({
        ...req,
        validateStatus: () => true,
      });

      ctx.payload = { statusCode: response.status, body: response.data } as HttpResponse;
      ctx.currentStep!.metadata.output.description = 'Hodr HTTP Response';

      if (response.request) {
        ctx.addJournalEntry({
          id: 'http-request-head',
          title: 'HTTP Request Head',
          description: 'Axios-generated Request Head',
          entry: response.request._header,
          typeHint: 'plaintext',
        });
      }

      return ctx.payload;
    } catch (err) {
      if (err instanceof AxiosError) {
        throw new HodrError(
          err.message,
          { http: { statusCode: err.code } },
          err.name,
          err.config,
          err.cause
        );
      } else {
        throw new HodrError(String(err));
      }
    }
  }
}
