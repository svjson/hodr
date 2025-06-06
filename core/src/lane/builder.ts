import type { ExecutionContext } from '../context';
import { HttpClient, HttpResponse } from '../destination';
import { FileSystemDestinationAdapter } from '../destination';
import { DefaultHttpClientDestinationAdapter } from '../destination';
import { HttpRequest } from '../destination/types';
import type {
  ExtractionMap,
  HttpClientConfig,
  HttpClientProvider,
  HttpStatusPattern,
  ObjectPathReference,
  StatusCondMap,
} from '../engine';
import { HodrError, extractPath, httpStatusMatcher } from '../engine';
import { Hodr } from '../types';
import { HodrDestination } from './destination';
import {
  CallStep,
  ExtractStep,
  MapStatusCodeStep,
  ParallelStep,
  SequenceStep,
  TransformStep,
  ValidateStep,
} from './step';
import type {
  DestinationBuilder,
  HodrStep,
  HttpClientDestinationBuilderStub,
  Lane,
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
  transform<T>(fn: (ctx: ExecutionContext<Payload>) => Promise<T>): LaneBuilder<T> {
    this.lane.steps.push(new TransformStep<Payload, T>(fn));
    return new LaneBuilder<T>(this.root, this.lane);
  }

  /** Register a sequencial step */
  sequence(steps: HodrStep[]): this {
    this.lane.steps.push(new SequenceStep(steps));
    return this;
  }

  /** Register a parallel execution step */
  parallel(steps: HodrStep[]): this {
    this.lane.steps.push(new ParallelStep(steps));
    return this;
  }

  httpGet(destination: string, path: string): HttpResponseLaneBuilder {
    this.lane.steps.push(new CallStep(destination, path));
    return new HttpResponseLaneBuilder(this.root, this.lane);
  }

  httpPost(destination: string, path: string): HttpResponseLaneBuilder {
    this.lane.steps.push(new CallStep(destination, path));
    return new HttpResponseLaneBuilder(this.root, this.lane);
  }

  httpPut(destination: string, path: string): HttpResponseLaneBuilder {
    this.lane.steps.push(new CallStep(destination, path));
    return new HttpResponseLaneBuilder(this.root, this.lane);
  }

  httpPatch(destination: string, path: string): HttpResponseLaneBuilder {
    this.lane.steps.push(new CallStep(destination, path));
    return new HttpResponseLaneBuilder(this.root, this.lane);
  }

  httpDelete(destination: string, path: string): HttpResponseLaneBuilder {
    this.lane.steps.push(new CallStep(destination, path));
    return new HttpResponseLaneBuilder(this.root, this.lane);
  }

  /** Register a destination invocation step */
  invokeDestination(destination: string, path: string): LaneBuilder<any> {
    this.lane.steps.push(new CallStep(destination, path));
    return this;
  }

  /** Register a validation step */
  validate(validatorObject: any): this;
  validate(path: string, validatorObject: any): this;
  validate(arg1: any, arg2?: any): this {
    if (arg2 && typeof arg1 !== 'string') {
      throw new HodrError('Invalid validator step configuration');
    }
    if (arg2 === undefined) {
      this.lane.steps.push(new ValidateStep(this.root, arg1));
    } else {
      this.lane.steps.push(new ValidateStep(this.root, arg2, arg1));
    }

    return this;
  }
}

export class RouterLaneBuilder extends LaneBuilder<HttpRequest> {}

export class HttpResponseLaneBuilder extends LaneBuilder<HttpResponse> {
  expectHttpOk(): HttpResponseLaneBuilder {
    this.lane.steps.push(httpStatusMatcher(200));
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
