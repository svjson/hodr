import { HodrContext } from '../context';
import { HttpClientConfig, HttpClientProvider } from '../engine';
import { Hodr } from '../types';

export interface UnitOfWork {
  root: () => Hodr;
  steps: HodrStep<any, any>[];
}

export interface HodrStep<Input = unknown, Output = unknown> {
  name: string;
  execute: (ctx: HodrContext<Input>) => Promise<Output>;
}

export interface Origin {
  name: string;
  type: string;
  inputs(): Input[];
}

export interface Input {
  name: string;
  type: string;
  variant(): string;
}

export interface Destination {
  root: () => Hodr;
  readonly name?: string;
  invoke(ctx: HodrContext, path: string): Promise<any>;
}

export interface DestinationBuilder {
  httpClient(httpClientConfig: HttpClientConfig): HttpClientDestinationBuilderStub;
  fileSystem(root: string): void;
}

export interface HttpClientDestinationBuilderStub {
  using(client: HttpClientProvider): void;
}
