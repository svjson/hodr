import { HodrContext } from '../context';
import { Hodr } from '../types';
import { HttpClient, HttpRequest } from './types';

import { compile } from 'path-to-regexp';

/**
 * An extremely simplistic DestinationAdapter for outgoing HTTP.
 *
 * To be torn out with its roots, kneaded into a ball and rolled out again, with
 * and interface/API that makes actual sense.
 *
 * Also has that one eyesore that breaks the zero-dependency badge of honour, in
 * order to parameterize uri templates. Perhaps it's better to allow the HttpClient-plugin
 * to deal with this - or just roll our own. How hard could it be? It couldn't possibly
 * reach left-pad levels of sheer complexity?
 */
export class HttpClientDestinationAdapter implements HttpClientServiceAdapterInterface {
  constructor(
    private root: () => Hodr,
    private httpClient: HttpClient
  ) {}

  async invoke(ctx: HodrContext, path: string): Promise<any> {
    const request = ctx.payload as HttpRequest;

    return await this.httpClient.request(ctx, {
      method: request.method,
      uri: compile(path)(request.params),
      params: request.params,
      body: request.body,
    });
  }
}
