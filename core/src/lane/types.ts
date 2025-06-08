import { ExecutionContext, AtomCollection } from '../context';
import { HttpClientConfig } from '../destination';
import { InitialStepExecution } from '../engine';
import { Hodr } from '../types';
import { HttpDestinationLaneBuilder } from './builder';
import { Target } from './destination';

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
  lane: Lane;

  variant(): string;

  newExecution(
    initialPayload: T,
    initialStep: InitialStepExecution,
    metadata?: Record<string, any>
  ): ExecutionContext<T>;
}

export interface Destination<T = any, Params = unknown> {
  root: () => Hodr;
  readonly name?: string;
  targets: Record<string, Target>;
  invoke(ctx: ExecutionContext<T>, path: string, params: Params): Promise<any>;
}

export type InternalStatusSuccessCode =
  | 'ok'
  | 'created'
  | 'accepted'
  | 'non-authorative'
  | 'no-content'
  | 'reset-content'
  | 'partial-content'
  | 'multi-status'
  | 'already-reported'
  | 'im-used';

export type InternalStatusClientErrorCode =
  | 'bad-request'
  | 'unauthorized'
  | 'payment-required'
  | 'forbidden'
  | 'resource-not-found'
  | 'not-allowed'
  | 'not-acceptable'
  | 'proxy-authentication-required'
  | 'request-timeout'
  | 'conflict'
  | 'gone'
  | 'length-required'
  | 'precondition-failed'
  | 'payload-too-large'
  | 'uri-too-long'
  | 'unsupported-media-type'
  | 'range-not-satisfiable'
  | 'expectation-failed'
  | 'i-am-a-teapot'
  | 'misdirected-request'
  | 'unprocessable-entity'
  | 'locked'
  | 'failed-dependency'
  | 'too-early'
  | 'upgrade-required'
  | 'precondition-required'
  | 'too-many-requests'
  | 'request-header-fields-too-large'
  | 'unavailable-for-legal-reasons';

export type InternalStatusServerErrorCode =
  | 'internal-error'
  | 'not-implemented'
  | 'bad-gateway'
  | 'service-unavailable'
  | 'gateway-timeout'
  | 'http-version-not-supported'
  | 'variant-also-negotiates'
  | 'insufficient-storage'
  | 'loop-detected'
  | 'not-extended'
  | 'network-authentication-required';

export type InternalStatusErrorCode =
  | InternalStatusClientErrorCode
  | InternalStatusServerErrorCode;

export type InternalStatusCode =
  | 'continue'
  | 'switching-protocol'
  | InternalStatusSuccessCode
  | 'multiple-choices'
  | 'moved-permanently'
  | 'found'
  | 'not-modified'
  | InternalStatusClientErrorCode
  | InternalStatusServerErrorCode;

export interface DestinationBuilder {
  httpClient(httpClientConfig: HttpClientConfig): HttpClientDestinationBuilder;
  fileSystem(root: string): void;
}

export interface HttpClientDestinationBuilder {
  target<T = any>(name: string): HttpDestinationLaneBuilder<T>;
  target<T = any>(
    name: string,
    configurator: (lane: HttpDestinationLaneBuilder<T>) => void
  ): HttpClientDestinationBuilder;
}

export type UsableType = 'tracker' | 'validator';

export interface Usable {
  __type: UsableType;
}

export type ExpectPredicateFunction<I> = (
  payload: I,
  ctx: ExecutionContext<I>,
  atoms: AtomCollection
) => Promise<boolean> | boolean;

export type TransformFunction<I, O> = (
  payload: I,
  ctx: ExecutionContext<I>,
  atoms: AtomCollection
) => Promise<O> | O;
