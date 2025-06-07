import type { ExecutionContext } from '../context';
import type {
  HttpClient,
  HttpResponse,
  HttpRequest,
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
  HttpClientDestinationBuilderStub,
  InternalStatusErrorCode,
  Lane,
  TransformFunction,
} from './types';

/**
 * The main fluent builder for setting up the chain of steps and processing that make up
 * up a lane/unit-of-work.
 */
export class LaneBuilder<Payload = any> {
  constructor(
    protected root: () => Hodr,
    public lane: Lane
  ) {}

  /** Register an extract step */
  extract<T>(directive: ExtractionMap | string): LaneBuilder<T> {
    this.lane.steps.push(new ExtractStep(directive));
    return new LaneBuilder<T>(this.root, this.lane);
  }

  /** Register a transform step */
  transform<O>(fn: TransformFunction<Payload, O>): LaneBuilder<O>;
  transform<I, O>(path: string, fn: TransformFunction<Payload, O>): LaneBuilder<O>;
  transform<O>(
    arg1: TransformFunction<Payload, O> | string,
    arg2?: TransformFunction<Payload, O>
  ): LaneBuilder<O> {
    this.lane.steps.push(new TransformStep<Payload, O>(arg1, arg2));
    return new LaneBuilder<O>(this.root, this.lane);
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

  /** Register an expect step */
  expect(
    pred: ExpectPredicateFunction<Payload>,
    errorCode: InternalStatusErrorCode | HttpStatusErrorCode
  ): this {
    this.lane.steps.push(new ExpectStep(this.root, pred, errorCode));
    return this;
  }

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

  literal<T = any>(value: T): this {
    this.lane.steps.push({
      name: 'literal',
      async execute(_ctx: ExecutionContext<any>): Promise<T> {
        return value;
      },
    });
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

  private _httpStep(
    method: HttpMethod,
    destination: string,
    path: string,
    params?: RequestParameters
  ): HttpResponseLaneBuilder {
    this.lane.steps.push(
      new CallStep(destination, path, Object.assign(params ?? {}, { method }))
    );
    return new HttpResponseLaneBuilder(this.root, this.lane);
  }

  httpGet(
    destination: string,
    path: string,
    params?: RequestParameters
  ): HttpResponseLaneBuilder {
    return this._httpStep('GET', destination, path, params);
  }

  httpPost(
    destination: string,
    path: string,
    params?: RequestParameters
  ): HttpResponseLaneBuilder {
    return this._httpStep('POST', destination, path, params);
  }

  httpPut(
    destination: string,
    path: string,
    params?: RequestParameters
  ): HttpResponseLaneBuilder {
    return this._httpStep('PUT', destination, path, params);
  }

  httpPatch(
    destination: string,
    path: string,
    params?: RequestParameters
  ): HttpResponseLaneBuilder {
    return this._httpStep('PATCH', destination, path, params);
  }

  httpDelete(
    destination: string,
    path: string,
    params?: RequestParameters
  ): HttpResponseLaneBuilder {
    return this._httpStep('DELETE', destination, path, params);
  }

  /** Register a destination invocation step */
  invokeDestination(destination: string, path: string): LaneBuilder<any> {
    this.lane.steps.push(new CallStep(destination, path));
    return this;
  }
}

export class RouterLaneBuilder extends LaneBuilder<HttpRequest> {}

export class HttpResponseLaneBuilder extends LaneBuilder<HttpResponse> {
  expectHttpOk(): HttpResponseLaneBuilder {
    this.lane.steps.push(httpStatusMatcher(200));
    return this;
  }

  expectHttpSuccess(): HttpResponseLaneBuilder {
    this.lane.steps.push(httpStatusMatcher(new HttpStatusRange(200, 220)));
    return this;
  }

  expectHttpStatus(...statusPattern: HttpStatusPattern[]): HttpResponseLaneBuilder {
    this.lane.steps.push(httpStatusMatcher(...statusPattern));
    return this;
  }

  extractResponseBody<T = any>(path?: ObjectPathReference) {
    this.lane.steps.push({
      name: 'extract-http-body',
      execute: (ctx: ExecutionContext<HttpResponse>) => {
        return Promise.resolve(extractPath(ctx.payload.body, path) as T);
      },
    });
    return new LaneBuilder<T>(this.root, this.lane);
  }

  mapStatusCode(statusMap: StatusCondMap): HttpResponseLaneBuilder {
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

  using(client: HttpClientProvider): void {
    const clientInstance: HttpClient = client(this.httpClientConfig);
    this.destination.adapter = new DefaultHttpClientDestinationAdapter(
      this.root,
      clientInstance
    );
  }
}
