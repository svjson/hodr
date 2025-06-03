import type { ExecutionContext } from '../context';
import { HttpClient, HttpResponse } from '../destination';
import { FileSystemDestinationAdapter } from '../destination/fs';
import { DefaultHttpClientDestinationAdapter } from '../destination/http';
import { HttpClientConfig, HttpClientProvider } from '../engine';
import { extractPath } from '../engine/transform';
import { ObjectPathReference } from '../engine/types';
import { httpStatusMatcher, HttpStatusPattern } from '../engine/validate';
import { Hodr } from '../types';
import { HttpRequest } from '../destination/types';
import { HodrDestination } from './destination';
import { CallStep, ParallelStep, SequenceStep, TransformStep } from './step';
import {
  DestinationBuilder,
  HodrStep,
  HttpClientDestinationBuilderStub,
  UnitOfWork,
} from './types';

/**
 * The main fluent builder for setting up the chain of steps and processing that make up
 * up a lane/unit-of-work.
 */
export class UnitOfWorkBuilder<Payload = any> {
  constructor(public unitOfWork: UnitOfWork) {}

  /** Register a transform step */
  transform<T>(fn: (ctx: ExecutionContext<Payload>) => Promise<T>): UnitOfWorkBuilder<T> {
    this.unitOfWork.steps.push(new TransformStep<Payload, T>(fn));
    return new UnitOfWorkBuilder<T>(this.unitOfWork);
  }

  /** Register a sequencial step */
  sequence(steps: HodrStep[]): this {
    this.unitOfWork.steps.push(new SequenceStep(steps));
    return this;
  }

  /** Register a parallel execution step */
  parallel(steps: HodrStep[]): this {
    this.unitOfWork.steps.push(new ParallelStep(steps));
    return this;
  }

  /** Register a destination invocation step */
  invokeDestination(destination: string, path: string): UnitOfWorkBuilder<any> {
    this.unitOfWork.steps.push(new CallStep(destination, path));
    return this;
  }
}

export class RouterUnitOfWorkBuilder extends UnitOfWorkBuilder<HttpRequest> {
  httpGet(service: string, path: string): HttpResponseUnitOfWorkBuilder {
    this.unitOfWork.steps.push(new CallStep(service, path));
    return new HttpResponseUnitOfWorkBuilder(this.unitOfWork);
  }

  httpPost(service: string, path: string): HttpResponseUnitOfWorkBuilder {
    this.unitOfWork.steps.push(new CallStep(service, path));
    return new HttpResponseUnitOfWorkBuilder(this.unitOfWork);
  }
}

export class HttpResponseUnitOfWorkBuilder extends UnitOfWorkBuilder<HttpResponse> {
  expectHttpOk(): HttpResponseUnitOfWorkBuilder {
    this.unitOfWork.steps.push(httpStatusMatcher(200));
    return this;
  }

  expectHttpStatus(...statusPattern: HttpStatusPattern[]): HttpResponseUnitOfWorkBuilder {
    this.unitOfWork.steps.push(httpStatusMatcher(...statusPattern));
    return this;
  }

  extractResponseBody<T = any>(path?: ObjectPathReference) {
    this.unitOfWork.steps.push({
      name: 'extract-http-body',
      execute: (ctx: ExecutionContext<HttpResponse>) => {
        return Promise.resolve(extractPath(ctx.payload.body, path) as T);
      },
    });
    return new UnitOfWorkBuilder<T>(this.unitOfWork);
  }
}

export class HodrDestinationBuilder implements DestinationBuilder {
  constructor(
    private root: () => Hodr,
    private service: HodrDestination
  ) {}

  httpClient(httpClientConfig: HttpClientConfig): HttpClientDestinationBuilderStub {
    return new HodrHttpClientDestinationBuilderStub(
      this.root,
      this.service,
      httpClientConfig
    );
  }

  fileSystem(root: string): void {
    this.service.adapter = new FileSystemDestinationAdapter(root);
  }
}

class HodrHttpClientDestinationBuilderStub implements HttpClientDestinationBuilderStub {
  constructor(
    private root: () => Hodr,
    private service: HodrDestination,
    private httpClientConfig: HttpClientConfig
  ) {}

  using(client: HttpClientProvider): void {
    const clientInstance: HttpClient = client(this.httpClientConfig);
    this.service.adapter = new DefaultHttpClientDestinationAdapter(
      this.root,
      clientInstance
    );
  }
}
