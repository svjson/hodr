/**
 * Sub-module for Destination implementations.
 *
 * Given that these, as "implementations", are still merely thin wrappers over
 * protocols and not actual implementations thereof this might perhaps just as well
 * go live in the engine or lane-module.
 */
export type { HttpClient, HttpMethod, HttpRequest, HttpResponse } from './types';
export { FileSystemDestinationAdapter } from './fs';

export { DefaultHttpClientDestinationAdapter, errorCodeToHttpStatus } from './http';
