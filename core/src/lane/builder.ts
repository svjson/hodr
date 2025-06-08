import type { ExecutionContext } from '../context';
import type {
  HttpClient,
  HttpResponse,
  RequestParameters,
  HttpMethod,
  HttpStatusErrorCode,
} from '../destination';
import {
  DefaultHttpClientDestinationAdapter,
  FileSystemDestinationAdapter,
} from '../destination';
import type {
  ExtractionMap,
  HttpClientConfig,
  HttpClientProvider,
  HttpStatusPattern,
  ObjectPathReference,
  StatusCondMap,
} from '../engine';
import { HodrError, extractPath, httpStatusMatcher } from '../engine';
import { HttpStatusRange } from '../engine/validate';
import { Hodr } from '../types';
import { HodrDestination } from './destination';
import {
  CallStep,
  ExpectStep,
  ExtractStep,
  MapStatusCodeStep,
  ParallelStep,
  SequenceStep,
  TransformStep,
  ValidateStep,
} from './step';
import type {
  DestinationBuilder,
  ExpectPredicateFunction,
  HodrStep,
  HttpClientDestinationBuilder,
  HttpClientDestinationBuilderStub,
  InternalStatusErrorCode,
  Lane,
  TransformFunction,
} from './types';

/**
 * The abstract base type for fluent lane builders, used to set up and configure
 * the chain of processing steps that make up a {@link Lane}.
 *
 * This base contains methods for creating all context-independent steps for extracting,
 * transforming and validating a payload.
 */
export abstract class BaseLaneBuilder<Payload, Self extends BaseLaneBuilder<any, any>> {
  constructor(
    protected root: () => Hodr,
    public lane: Lane
  ) {}

  protected self<O>(): Self {
    throw new Error('This is a template method.');
  }

  /** Register an extract step */
  extract<Payload>(directive: ExtractionMap | string): Self {
    this.lane.steps.push(new ExtractStep<Payload, any>(directive));
    return this.self<any>();
  }

  /** Register a transform step */
  transform<O>(fn: TransformFunction<Payload, O>): Self;
  transform<Payload, O>(path: string, fn: TransformFunction<Payload, O>): Self;
  transform<O>(
    arg1: TransformFunction<Payload, O> | string,
    arg2?: TransformFunction<Payload, O>
  ): Self {
    this.lane.steps.push(new TransformStep<Payload, O>(arg1, arg2));
    return this.self<O>();
  }

  /** Register a validation step */
  validate(validatorObject: any): this;
  validate(path: string, validatorObject: any): this;
  validate(arg1: any, arg2?: any): this {
    if (arg2 && typeof arg1 !== 'string') {
      throw new HodrError('Invalid validator step configuration.');
    }
    if (arg2 === undefined) {
      this.lane.steps.push(new ValidateStep(this.root, arg1));
    } else {
      this.lane.steps.push(new ValidateStep(this.root, arg2, arg1));
    }

    return this;
  }

  /**
   * Register an expect step.
   *
   * Can be used for instant bail-out whenever the conditions for a process are not met,
   * according to arbitrary business logic or system invariants.
   *
   * @param pred - The predicate function, returning `true` if the expectation is fulfilled
   *               or otherwise `false`.
   @ @param errorCode - The error code to raise in case the expectation is not fulfilled.
   */
  expect(
    pred: ExpectPredicateFunction<Payload>,
    errorCode: InternalStatusErrorCode | HttpStatusErrorCode
  ): this {
    this.lane.steps.push(new ExpectStep(this.root, pred, errorCode));
    return this;
  }

  /**
   * Register an expect step verifying that the payload is currently not nil.
   *
   * Syntactic sugar for ```.expect((v) => v !== null && v !== undefined)````
   */
  expectValue(errorCode: InternalStatusErrorCode | HttpStatusErrorCode): this {
    this.lane.steps.push(
      new ExpectStep(
        this.root,
        (v) => v !== null && v !== undefined,
        errorCode,
        'expect-value'
      )
    );
    return this;
  }

  /**
   * Supply a value for `Payload` unrelated to the Lane processing chain.
   *
   * No processing is applied to `value`.
   */
  literal<T = any>(value: T): Self {
    this.lane.steps.push({
      name: 'literal',
      async execute(_ctx: ExecutionContext<any>): Promise<T> {
        return value;
      },
    });
    return this.self<T>();
  }

  /**
   * Register a dispatch to/invocation of a {@link Target} on a {@link Destination}.
   */
  dispatch(destination: string, target: string): Self {
    const dest = this.root().destinations[destination];
    if (!dest) {
      throw new HodrError(
        `No such Destination: '${destination}'. Available Destinations: ${Object.keys(this.root().destinations).join(', ')}`
      );
    }
    const _target = dest.targets[target];
    if (!_target) {
      throw new HodrError(
        `No such Target: '${target}'. Available Targets on Destination '${destination}': ${Object.keys(dest.targets).join(', ')}`
      );
    }

    for (const step of _target.lane.steps) {
      this.lane.steps.push(step);
    }

    return this.self<any>();
  }

  /**
   * Register a destination invocation step
   * FIXME: Deprecated in favor of {@link dispatch} ?
   */
  invokeDestination(destination: string, path: string): this {
    this.lane.steps.push(new CallStep(destination, path));
    return this;
  }

  /** Register a sequential step */
  sequence(steps: HodrStep[]): this {
    this.lane.steps.push(new SequenceStep(steps));
    return this;
  }

  /** Register a parallel execution step */
  parallel(steps: HodrStep[]): this {
    this.lane.steps.push(new ParallelStep(steps));
    return this;
  }

  protected _httpStep<PB extends BaseLaneBuilder<any, any>>(
    self: BaseLaneBuilder<any, any>,
    method: HttpMethod,
    destination: string,
    uri: string,
    params?: RequestParameters
  ): HttpResponseLaneBuilder<PB> {
    this.lane.steps.push(
      new CallStep(destination, uri, Object.assign(params ?? {}, { method }))
    );
    return new HttpResponseLaneBuilder<PB>(self as PB, this.root, this.lane);
  }
}

/**
 * Adds http step builder function for building lanes that are not themselves
 * part of an HttpClient Destination.
 */
export class GenericLaneBuilder<Payload = any> extends BaseLaneBuilder<
  Payload,
  GenericLaneBuilder<Payload>
> {
  constructor(
    protected root: () => Hodr,
    public lane: Lane
  ) {
    super(root, lane);
  }

  protected override self<O>(): GenericLaneBuilder<O> {
    return this as unknown as GenericLaneBuilder<O>;
  }

  httpGet(
    destination: string,
    uri: string,
    params?: RequestParameters
  ): HttpResponseLaneBuilder<GenericLaneBuilder<HttpResponse>> {
    return this._httpStep<GenericLaneBuilder<HttpResponse>>(
      this,
      'GET',
      destination,
      uri,
      params
    );
  }

  httpPost(
    destination: string,
    uri: string,
    params?: RequestParameters
  ): HttpResponseLaneBuilder<GenericLaneBuilder<HttpResponse>> {
    return this._httpStep(this, 'POST', destination, uri, params);
  }

  httpPut(
    destination: string,
    uri: string,
    params?: RequestParameters
  ): HttpResponseLaneBuilder<GenericLaneBuilder<HttpResponse>> {
    return this._httpStep(this, 'PUT', destination, uri, params);
  }

  httpPatch(
    destination: string,
    uri: string,
    params?: RequestParameters
  ): HttpResponseLaneBuilder<GenericLaneBuilder<HttpResponse>> {
    return this._httpStep(this, 'PATCH', destination, uri, params);
  }

  httpDelete(
    destination: string,
    uri: string,
    params?: RequestParameters
  ): HttpResponseLaneBuilder<GenericLaneBuilder<HttpResponse>> {
    return this._httpStep(this, 'DELETE', destination, uri, params);
  }
}

/**
 * Adds http step builder function for building lanes that are themselves
 * part of an HttpClient Destination and can therefore forgo specifying the
 * destination responsible for the call.
 */
export class HttpDestinationLaneBuilder<Payload = any> extends BaseLaneBuilder<
  Payload,
  HttpDestinationLaneBuilder<Payload>
> {
  constructor(
    protected root: () => Hodr,
    public lane: Lane,
    private destination: string
  ) {
    super(root, lane);
  }

  httpGet(
    uri: string,
    params?: RequestParameters
  ): HttpResponseLaneBuilder<HttpDestinationLaneBuilder<HttpResponse>> {
    return this._httpStep(this, 'GET', this.destination, uri, params);
  }

  httpPost(
    uri: string,
    params?: RequestParameters
  ): HttpResponseLaneBuilder<HttpDestinationLaneBuilder<HttpResponse>> {
    return this._httpStep(this, 'POST', this.destination, uri, params);
  }

  httpPut(
    uri: string,
    params?: RequestParameters
  ): HttpResponseLaneBuilder<HttpDestinationLaneBuilder<HttpResponse>> {
    return this._httpStep(this, 'PUT', this.destination, uri, params);
  }

  httpPatch(
    uri: string,
    params?: RequestParameters
  ): HttpResponseLaneBuilder<HttpDestinationLaneBuilder<HttpResponse>> {
    return this._httpStep(this, 'PATCH', this.destination, uri, params);
  }

  httpDelete(
    uri: string,
    params?: RequestParameters
  ): HttpResponseLaneBuilder<HttpDestinationLaneBuilder<HttpResponse>> {
    return this._httpStep(this, 'DELETE', this.destination, uri, params);
  }
}

/**
 * Specialized lane builder sub-type added steps for operation on and verifying
 * the HttpResponse returned from an HttpOperation.
 */
export class HttpResponseLaneBuilder<
  PB extends BaseLaneBuilder<any, PB>,
> extends BaseLaneBuilder<HttpResponse, HttpResponseLaneBuilder<PB>> {
  constructor(
    readonly parent: PB,
    readonly root: () => Hodr,
    public lane: Lane
  ) {
    super(root, lane);
  }

  expectHttpOk(): HttpResponseLaneBuilder<PB> {
    this.lane.steps.push(httpStatusMatcher(200));
    return this;
  }

  expectHttpSuccess(): HttpResponseLaneBuilder<PB> {
    this.lane.steps.push(httpStatusMatcher(new HttpStatusRange(200, 220)));
    return this;
  }

  expectHttpStatus(...statusPattern: HttpStatusPattern[]): HttpResponseLaneBuilder<PB> {
    this.lane.steps.push(httpStatusMatcher(...statusPattern));
    return this;
  }

  extractResponseBody<T = any>(path?: ObjectPathReference): PB {
    this.lane.steps.push({
      name: 'extract-http-body',
      execute: (ctx: ExecutionContext<HttpResponse>) => {
        return Promise.resolve(extractPath(ctx.payload.body, path) as T);
      },
    });
    return this.parent;
  }

  mapStatusCode(statusMap: StatusCondMap): HttpResponseLaneBuilder<PB> {
    this.lane.steps.push(new MapStatusCodeStep(statusMap));
    return this;
  }
}

export class HodrDestinationBuilder implements DestinationBuilder {
  constructor(
    private root: () => Hodr,
    private destination: HodrDestination
  ) {}

  httpClient(httpClientConfig: HttpClientConfig): HttpClientDestinationBuilderStub {
    return new HodrHttpClientDestinationBuilderStub(
      this.root,
      this.destination,
      httpClientConfig
    );
  }

  fileSystem(root: string): void {
    this.destination.adapter = new FileSystemDestinationAdapter(root);
  }
}

class HodrHttpClientDestinationBuilderStub implements HttpClientDestinationBuilderStub {
  constructor(
    private root: () => Hodr,
    private destination: HodrDestination,
    private httpClientConfig: HttpClientConfig
  ) {}

  using(client: HttpClientProvider): HttpClientDestinationBuilder {
    const clientInstance: HttpClient = client(this.httpClientConfig);
    this.destination.adapter = new DefaultHttpClientDestinationAdapter(
      this.root,
      clientInstance
    );
    return new HodrHttpClientDestinationBuilder(this.root, this.destination);
  }
}

class HodrHttpClientDestinationBuilder implements HttpClientDestinationBuilder {
  constructor(
    private root: () => Hodr,
    private destination: HodrDestination
  ) {}

  target<T = any>(name: string): HttpDestinationLaneBuilder<T>;
  target<T = any>(
    name: string,
    configurator: (lane: HttpDestinationLaneBuilder<T>) => void
  ): HttpClientDestinationBuilder;
  target<T = any>(
    name: string,
    configurator?: (lane: HttpDestinationLaneBuilder<T>) => void
  ): HttpDestinationLaneBuilder<T> | HttpClientDestinationBuilder {
    const target = this.destination.createTarget(name);
    const builder = new HttpDestinationLaneBuilder<T>(
      this.root,
      target.lane,
      this.destination.name
    );

    if (configurator) {
      configurator(builder);
      return this;
    }

    return builder;
  }
}
