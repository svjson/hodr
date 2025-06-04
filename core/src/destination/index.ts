/**
 * Sub-module for Destination implementations.
 *
 * Given that these are still, as "implementations" merely thin wrappers over
 * protocols - not actual implementations thereof - this might perhaps just live
 * in the engine or lane-module.
 */
export type { HttpClient, HttpRequest, HttpResponse } from './types';
export { FileSystemDestinationAdapter } from './fs';

export { DefaultHttpClientDestinationAdapter } from './http';
