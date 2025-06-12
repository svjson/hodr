import { describe, it, expect } from 'vitest';
import { HttpClientProvider, HttpRequest, makeHodr, memoryTracker } from '@hodr/core';
import {
  makeFakeHttpClientPlugin,
  makeRequestContext,
  testRouteAdapter,
} from '@hodr/testkit';

const setupTestDestination = () => {
  const hodr = makeHodr();
  hodr.use(memoryTracker({ limit: 10 }));

  const router = hodr.router('test-router');

  const client: HttpClientProvider = makeFakeHttpClientPlugin({
    '/comments/listing/thread/5': {
      POST: (req: HttpRequest) => ({
        statusCode: 201,
        body: {
          content: {
            ...req.body,
            id: 558,
            createdAt: 1749246021270,
          },
          _links: { self: 'http://www.hatsofmeat.com' },
        },
      }),
    },
  });

  hodr.destination('test-destination').httpClient({ adapter: client });

  return { router, hodr };
};

describe('Route Execution', () => {
  it('uses body, session, and params to construct a POST request, sends it to the remote, and maps the response back to the client', async () => {
    // Given  //
    const { router } = setupTestDestination();

    router
      .post('/comments/:targetType/thread/:targetId')
      .extract({
        threadId: 'params',
        account: 'session.account',
        comment: 'body',
      })
      .transform('comment', ({ comment, account }: any) => ({
        authorId: account?.id,
        authorName: account?.name,
        ...comment,
      }))
      .httpPost('test-destination', '/comments/:targetType/thread/:targetId', {
        pathParams: 'threadId',
        body: 'comment',
      })
      .ensureHttpSuccess()
      .extractResponseBody('content');

    // When  //
    const testCtx = makeRequestContext({
      method: 'POST',
      uri: '/comments/listing/thread/5',
      params: { targetType: 'listing', targetId: '5' },
      session: {
        account: {
          id: 8844,
          name: 'Ella Vator',
        },
      },
      body: { type: 'comment', comment: 'Sometimes I go up, sometimes I go down!' },
    });

    await router.routes[0].handleRequest(testCtx, testRouteAdapter);

    // Then  //
    expect(testCtx.response).toBeDefined();
    expect(testCtx.response!.body).toMatchObject({
      id: 558,
      authorId: 8844,
      authorName: 'Ella Vator',
      type: 'comment',
      comment: 'Sometimes I go up, sometimes I go down!',
      createdAt: 1749246021270,
    });
  });

  it('will use input HTTP Request to construct a new outgoing HTTP Request if preserved', async () => {
    // Given  //
    const { router } = setupTestDestination();

    router
      .post('/comments/:targetType/thread/:targetId')
      .httpPost('test-destination', '/comments/:targetType/thread/:targetId')
      .ensureHttpSuccess()
      .extractResponseBody('content');

    // When  //
    const testCtx = makeRequestContext({
      method: 'POST',
      uri: '/comments/listing/thread/5',
      params: { targetType: 'listing', targetId: '5' },
      body: {
        authorId: 8844,
        authorName: 'Ella Vator',
        type: 'comment',
        comment: 'Sometimes I go up, sometimes I go down!',
      },
    });

    await router.routes[0].handleRequest(testCtx, testRouteAdapter);

    // Then  //
    expect(testCtx.response).toBeDefined();
    expect(testCtx.response!.body).toMatchObject({
      id: 558,
      authorId: 8844,
      authorName: 'Ella Vator',
      type: 'comment',
      comment: 'Sometimes I go up, sometimes I go down!',
      createdAt: 1749246021270,
    });
  });
});
