import { ExecutionContext } from '../context';
import { HttpClientConfig, HttpClientProvider, InitialStepExecution } from '../engine';
import { Hodr } from '../types';

export interface Lane {
  root: () => Hodr;
  steps: HodrStep<any, any>[];
}

export interface HodrStep<Input = unknown, Output = unknown> {
  name: string;
  execute: (ctx: ExecutionContext<Input>) => Promise<Output>;
}

export interface Origin {
  name: string;
  type: string;
  inputs(): Input<any>[];
}

export interface Input<T> {
  name: string;
  type: string;
  variant(): string;

  newExecution(
    initialPayload: T,
    initialStep: InitialStepExecution,
    metadata?: Record<string, any>
  ): ExecutionContext<T>;
}

export interface Destination<T = any> {
  root: () => Hodr;
  readonly name?: string;
  invoke(ctx: ExecutionContext<T>, path: string): Promise<any>;
}

export interface DestinationBuilder {
  httpClient(httpClientConfig: HttpClientConfig): HttpClientDestinationBuilderStub;
  fileSystem(root: string): void;
}

export interface HttpClientDestinationBuilderStub {
  using(client: HttpClientProvider): void;
}
