import type { ExecutionContext } from '../context';
import type {
  HttpClientConfig,
  HttpResponse,
  RequestParameters,
  HttpMethod,
  HttpStatusErrorCode,
} from '../destination';
import {
  DefaultHttpClientDestinationAdapter,
  FileSystemDestinationAdapter,
} from '../destination';
import type { ExtractionMap, HttpStatusPattern, StatusCondMap } from '../engine';
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
  InternalStatusErrorCode,
  Lane,
  TransformFunction,
} from './types';

/**
 * Conditional type that extracts the Payload type from any specialization of
 * BaseLaneBuilder.
 *
 * Used to infer the output type from sub-lanes, specifically for `ParallelStep`s
 * registered through .parallel.
 */
type ExtractLaneType<T> = T extends BaseLaneBuilder<infer U, any> ? U : never;

/**
 * Mapped type that extracts the individual Payload types from an array of BaseLaneBuilder
 * specializations.
 *
 * Used to infer the output types from the sub-lanes of `ParallelStep`s registered
 * through .parallel.
 *
 * The functions must be concrete and statically known for TypeScript to infer properly.
 * Dynamic construction won’t work.
 */
type ExtractLaneTypes<Fns extends Array<(lane: any) => BaseLaneBuilder<any, any>>> = {
  [K in keyof Fns]: ExtractLaneType<ReturnType<Fns[K]>>;
};

/**
 * Discriminating type function used to re-apply the generic type argument of Payload
 * for the LaneBuilder-hierarchy.
 *
 * Used by the self<o>-mechanism of the builder hierarchy for the return type of
 * step-registering methods that result in a change of the current Payload type.
 *
 * This is a bit dodgy, both because it requires all subtypes to be manually registered
 * in this binary chain of ternaries and because it may produce union types if the
 * concrete builder cannot be determined, which breaks the fluent interface.
 */
type ReplacePayload<B, O> =
  B extends GenericLaneBuilder<any>
    ? GenericLaneBuilder<O>
    : B extends HttpResponseLaneBuilder<any, infer P>
      ? HttpResponseLaneBuilder<O, P>
      : B extends HttpDestinationLaneBuilder<any>
        ? HttpDestinationLaneBuilder<O>
        : never; // anything else is an error, for better or worse.

/**
 * The abstract base class for fluent lane builders, which are used to construct
 * and configure the sequence of processing steps that make up a {@link Lane}.
 *
 * Lane builders allow chaining of context-free operations like extraction, transformation,
 * validation, branching, and dispatch. Each such operation transforms the `Payload` type
 * flowing through the lane, with each chained method returning a builder type
 * representing the new payload.
 *
 * @typeParam Payload - The current payload type flowing through the lane.
 * @typeParam Self - The concrete builder subclass, used for preserving fluent method chaining.
 *
 * Concrete subclasses (like {@link GenericLaneBuilder} or {@link HttpResponseLaneBuilder})
 * may extend this base with additional context-aware operations, such as HTTP validation
 * or response mapping. Type-safe transitions between builder types are managed through
 * the `self<O>()` method, which produces a new builder instance with a different payload.
 */
export abstract class BaseLaneBuilder<Payload, Self extends BaseLaneBuilder<any, any>> {
  constructor(
    protected root: () => Hodr,
    public lane: Lane
  ) {}

  /**
   * Returns a new instance of the concrete builder type with the specified output type.
   *
   * Requires each sub-class to provide its own implementation, which may or may not
   * produce a new builder instance(but with target lane intact).
   *
   * @typeParam O - The type with which to replace the current Payload type.
   */
  protected abstract self<O>(): ReplacePayload<Self, O>;
  protected _invokeSelf<B extends BaseLaneBuilder<any, any>, O>(
    builder: B
  ): ReplacePayload<B, O> {
    return builder.self<O>() as any;
  }

  /**
   * Creates a new instance of the concrete builder type with an empty lane.
   *
   * Used by steps that branch off into sub-lanes, such as `ParallelStep` and
   * `SequentialStep`.
   *
   * Requires each sub-class to provide its own implementation.
   */
  protected abstract _fork(): this;

  /**
   * Register an `ExtractStep`.
   *
   * This step extracts a value from the current `Payload` using the
   * provided `directive`, which can be a string path or an
   * `ExtractionMap`.
   *
   * Due to the shape of the current implementation we cannot infer the types involved,
   * which breaks the type-safety of the fluent interface, unless a type is provided by
   * the caller.
   *
   * @param directive - The extraction directive, either a string path or an `ExtractionMap`.
   *
   * @returns A new instance of the concrete builder type with the extracted payload type.
   */
  extract<Out = Payload>(directive: ExtractionMap | string) {
    this.lane.steps.push(new ExtractStep<Payload, any>(directive));
    return this.self<Out>();
  }

  /**
   * Register a transform step.
   *
   * This step applies a transformation function to the current `Payload`,
   * optionally producing a new Payload type.
   *
   * @typeParam O - The type of the output after the transformation. Will usually
   * be inferred from the return value of the `TransformFunction`.
   *
   * @param path - Optional string path to apply the transformation to.
   * @param fn - The transformation function to apply to the current `Payload`.
   */
  transform<O>(fn: TransformFunction<Payload, O>): ReplacePayload<Self, O>;
  transform<Payload, O>(
    path: string,
    fn: TransformFunction<Payload, O>
  ): ReplacePayload<Self, O>;
  transform<O>(
    arg1: TransformFunction<Payload, O> | string,
    arg2?: TransformFunction<Payload, O>
  ): ReplacePayload<Self, O> {
    this.lane.steps.push(new TransformStep<Payload, O>(arg1, arg2));
    return this.self<O>();
  }

  /** Register a parallel execution step */
  parallel<
    Fns extends [
      (lane: this) => BaseLaneBuilder<any, any>,
      ...((lane: this) => BaseLaneBuilder<any, any>)[],
    ],
    O extends readonly unknown[] = ExtractLaneTypes<Fns>,
  >(...stepProducers: Fns): ReplacePayload<Self, O> {
    const lanes = stepProducers.map((producer) => producer(this._fork()).lane);
    this.lane.steps.push(new ParallelStep<Payload, O>(this.root, lanes));
    return this.self<O>();
  }

  /**
   * Register a validation step.
   *
   * This step validates the current payload using the provided validator.
   *
   * In order for the `ValidateStep` to be able to use the validator object,
   * a feature that provides validation support for the validatorObject must
   * have been registered on the root Hodr application.
   *
   * @param validatorObject - The object to use for validation, which can be a
   *                          schema, a validation function, or any other object
   *                          as long as a validation feature to handle it has been
   *                          registered.
   */
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
  ): this;
  expect(
    expression: string,
    errorCode: InternalStatusErrorCode | HttpStatusErrorCode
  ): this;
  expect(
    pred: ExpectPredicateFunction<Payload> | string,
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
  literal<T = any>(value: T) {
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
  dispatch(destination: string, target: string): BaseLaneBuilder<any, any> {
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

  protected _httpStep<InvokingBuilder extends BaseLaneBuilder<any, any>>(
    self: InvokingBuilder,
    method: HttpMethod,
    destination: string,
    uri: string,
    params?: RequestParameters
  ): HttpResponseLaneBuilder<HttpResponse, InvokingBuilder> {
    this.lane.steps.push(
      new CallStep(destination, uri, Object.assign(params ?? {}, { method }))
    );
    return new HttpResponseLaneBuilder<HttpResponse, InvokingBuilder>(
      self,
      this.root,
      this.lane
    );
  }
}

/**
 * Adds http step builder function for building lanes that are not themselves
 * part of an HttpClient Destination.
 */
export class GenericLaneBuilder<Payload> extends BaseLaneBuilder<
  Payload,
  GenericLaneBuilder<any>
> {
  constructor(
    protected root: () => Hodr,
    public lane: Lane
  ) {
    super(root, lane);
  }

  protected override self<O>(): GenericLaneBuilder<O> {
    return new GenericLaneBuilder<O>(
      this.root,
      this.lane
    ) as unknown as GenericLaneBuilder<O>;
  }

  protected override _fork(): this {
    return new GenericLaneBuilder<Payload>(this.root, {
      root: this.root,
      steps: [],
    }) as this;
  }

  httpGet(
    destination: string,
    uri: string,
    params?: RequestParameters
  ): HttpResponseLaneBuilder<HttpResponse, any> {
    return this._httpStep(this, 'GET', destination, uri, params);
  }

  httpPost(
    destination: string,
    uri: string,
    params?: RequestParameters
  ): HttpResponseLaneBuilder<HttpResponse, any> {
    return this._httpStep(this, 'POST', destination, uri, params);
  }

  httpPut(
    destination: string,
    uri: string,
    params?: RequestParameters
  ): HttpResponseLaneBuilder<HttpResponse, any> {
    return this._httpStep(this, 'PUT', destination, uri, params);
  }

  httpPatch(
    destination: string,
    uri: string,
    params?: RequestParameters
  ): HttpResponseLaneBuilder<HttpResponse, any> {
    return this._httpStep(this, 'PATCH', destination, uri, params);
  }

  httpDelete(
    destination: string,
    uri: string,
    params?: RequestParameters
  ): HttpResponseLaneBuilder<HttpResponse, any> {
    return this._httpStep(this, 'DELETE', destination, uri, params);
  }
}

/**
 * Specialized lane builder sub-type added steps for operation on and verifying
 * the HttpResponse returned from an HttpOperation.
 */
export class HttpResponseLaneBuilder<
  Payload,
  ParentBuilder extends BaseLaneBuilder<HttpResponse, any>,
> extends BaseLaneBuilder<Payload, ParentBuilder> {
  constructor(
    readonly parent: ParentBuilder,
    readonly root: () => Hodr,
    public lane: Lane
  ) {
    super(root, lane);
  }

  protected override self<O>(): ReplacePayload<ParentBuilder, O> {
    return this._invokeSelf<ParentBuilder, O>(this.parent);
  }

  protected override _fork(): this {
    return new HttpResponseLaneBuilder<Payload, ParentBuilder>(this.parent, this.root, {
      root: this.root,
      steps: [],
    }) as this;
  }

  expectHttpOk(): this {
    this.lane.steps.push(httpStatusMatcher(200));
    return this;
  }

  expectHttpSuccess(): this {
    this.lane.steps.push(httpStatusMatcher(new HttpStatusRange(200, 220)));
    return this;
  }

  expectHttpStatus(...statusPattern: HttpStatusPattern[]): this {
    this.lane.steps.push(httpStatusMatcher(...statusPattern));
    return this;
  }

  extractResponseBody(expression?: string): ParentBuilder {
    this.lane.steps.push({
      name: 'extract-http-body',
      execute: async (ctx: ExecutionContext<HttpResponse>) => {
        return extractPath(ctx.payload.body, expression!);
      },
    });
    return this.parent;
  }

  mapStatusCode(statusMap: StatusCondMap): this {
    this.lane.steps.push(new MapStatusCodeStep(statusMap));
    return this;
  }
}

export class HodrDestinationBuilder implements DestinationBuilder {
  constructor(
    private root: () => Hodr,
    private destination: HodrDestination
  ) {}

  httpClient(httpClientConfig: HttpClientConfig): HttpClientDestinationBuilder {
    if (httpClientConfig.adapter) {
      this.destination.adapter = new DefaultHttpClientDestinationAdapter(
        this.root,
        httpClientConfig
      );
    }
    return new HodrHttpClientDestinationBuilder(this.root, this.destination);
  }

  fileSystem(root: string): void {
    this.destination.adapter = new FileSystemDestinationAdapter(root);
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

  protected override self<O>(): HttpDestinationLaneBuilder<O> {
    return this as unknown as HttpDestinationLaneBuilder<O>;
  }

  protected _fork(): this {
    return new HttpDestinationLaneBuilder<Payload>(
      this.root,
      { root: this.root, steps: [] },
      this.destination
    ) as this;
  }

  httpGet(
    params?: RequestParameters
  ): HttpResponseLaneBuilder<HttpResponse, HttpDestinationLaneBuilder<any>>;
  httpGet(
    uri: string,
    params?: RequestParameters
  ): HttpResponseLaneBuilder<HttpResponse, HttpDestinationLaneBuilder<any>>;
  httpGet(
    arg1: string | RequestParameters | undefined,
    arg2?: RequestParameters
  ): HttpResponseLaneBuilder<HttpResponse, HttpDestinationLaneBuilder<any>> {
    const uri = typeof arg1 === 'string' ? arg1 : '';
    if (arg2 && typeof arg1 !== 'string') {
      throw new Error('Invalid configuration of httpGet');
    }
    const params = typeof arg1 === 'string' ? arg2 : arg1;
    return this._httpStep(this, 'GET', this.destination, uri, params);
  }

  httpPost(
    params?: RequestParameters
  ): HttpResponseLaneBuilder<HttpResponse, HttpDestinationLaneBuilder<any>>;
  httpPost(
    uri: string,
    params?: RequestParameters
  ): HttpResponseLaneBuilder<HttpResponse, HttpDestinationLaneBuilder<any>>;
  httpPost(
    arg1: string | RequestParameters | undefined,
    arg2?: RequestParameters
  ): HttpResponseLaneBuilder<HttpResponse, HttpDestinationLaneBuilder<any>> {
    const uri = typeof arg1 === 'string' ? arg1 : '';
    if (arg2 && typeof arg1 !== 'string') {
      throw new Error('Invalid configuration of httpPost');
    }
    const params = typeof arg1 === 'string' ? arg2 : arg1;
    return this._httpStep(this, 'POST', this.destination, uri, params);
  }

  httpPut(
    params?: RequestParameters
  ): HttpResponseLaneBuilder<HttpResponse, HttpDestinationLaneBuilder<any>>;
  httpPut(
    uri: string,
    params?: RequestParameters
  ): HttpResponseLaneBuilder<HttpResponse, HttpDestinationLaneBuilder<any>>;
  httpPut(
    arg1: string | RequestParameters | undefined,
    arg2?: RequestParameters
  ): HttpResponseLaneBuilder<HttpResponse, HttpDestinationLaneBuilder<any>> {
    const uri = typeof arg1 === 'string' ? arg1 : '';
    if (arg2 && typeof arg1 !== 'string') {
      throw new Error('Invalid configuration of httpPut');
    }
    const params = typeof arg1 === 'string' ? arg2 : arg1;
    return this._httpStep(this, 'PUT', this.destination, uri, params);
  }

  httpPatch(
    params?: RequestParameters
  ): HttpResponseLaneBuilder<HttpResponse, HttpDestinationLaneBuilder<any>>;
  httpPatch(
    uri: string,
    params?: RequestParameters
  ): HttpResponseLaneBuilder<HttpResponse, HttpDestinationLaneBuilder<any>>;
  httpPatch(
    arg1: string | RequestParameters | undefined,
    arg2?: RequestParameters
  ): HttpResponseLaneBuilder<HttpResponse, HttpDestinationLaneBuilder<any>> {
    const uri = typeof arg1 === 'string' ? arg1 : '';
    if (arg2 && typeof arg1 !== 'string') {
      throw new Error('Invalid configuration of httpPatch');
    }
    const params = typeof arg1 === 'string' ? arg2 : arg1;
    return this._httpStep(this, 'PATCH', this.destination, uri, params);
  }

  httpDelete(
    params?: RequestParameters
  ): HttpResponseLaneBuilder<HttpResponse, HttpDestinationLaneBuilder<any>>;
  httpDelete(
    uri: string,
    params?: RequestParameters
  ): HttpResponseLaneBuilder<HttpResponse, HttpDestinationLaneBuilder<any>>;
  httpDelete(
    arg1: string | RequestParameters | undefined,
    arg2?: RequestParameters
  ): HttpResponseLaneBuilder<HttpResponse, HttpDestinationLaneBuilder<any>> {
    const uri = typeof arg1 === 'string' ? arg1 : '';
    if (arg2 && typeof arg1 !== 'string') {
      throw new Error('Invalid configuration of httpDelete');
    }
    const params = typeof arg1 === 'string' ? arg2 : arg1;
    return this._httpStep(this, 'DELETE', this.destination, uri, params);
  }
}
