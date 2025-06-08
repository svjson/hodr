/**
 * Sub-module for Destination implementations.
 *
 * Given that these, as "implementations", are still merely thin wrappers over
 * protocols and not actual implementations thereof this might perhaps just as well
 * go live in the engine or lane-module.
 */
export type {
  HttpClient,
  HttpClientConfig,
  HttpClientProvider,
  HttpMethod,
  HttpRequest,
  HttpResponse,
  HttpStatusCode,
  HttpStatusErrorCode,
  RequestParameters,
} from './types';
export { FileSystemDestinationAdapter } from './fs';

export {
  DefaultHttpClientDestinationAdapter,
  errorCodeToHttpStatus,
  httpErrorStatusToInternal,
  httpStatusToInternal,
  internalStatusToHttpStatus,
  joinUriParts,
  resolveCanonicalHttpStatus,
} from './http';
