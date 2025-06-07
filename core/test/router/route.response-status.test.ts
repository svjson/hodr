import { HttpRequest, makeHodr, memoryTracker } from '@hodr/core';
import {
  AlwaysFailValidator,
  makeRequestContext,
  setupTestDestination,
  testRouteAdapter,
} from '@hodr/testkit';
import { describe, expect, it } from 'vitest';

describe('Route Response Status Propagation', () => {
  it('should respond with 400 Bad Request if validation fails', async () => {
    // Given  //
    const { router } = setupTestDestination({
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

    router
      .post('/comments/:targetType/thread/:targetId')
      .validate(AlwaysFailValidator)
      .httpPost('test-destination', '/comments/listing/thread/5')
      .extractResponseBody('content');

    // When  //

    const testCtx = makeRequestContext({
      uri: '/comments/listing/thread/5',
      body: {
        uffstay: 'from the unktray',
      },
    });

    await router.routes[0].handleRequest(testCtx, testRouteAdapter);

    // Then  //

    expect(testCtx.response!.statusCode).toBe(400);
  });

  it('should propagate a 409 Conflict from a downstream http service', async () => {
    // Given  //
    const { router } = setupTestDestination({
      '/stuff': {
        POST: {
          statusCode: 409,
          body: {
            error: 'You tried to steal my booked laundry time. This causes a CONFLICT!',
          },
        },
      },
    });

    router
      .post('/stuff')
      .httpPost('test-destination', '/stuff')
      .expectHttpSuccess()
      .extractResponseBody('content');

    // When  //

    const testCtx = makeRequestContext({
      uri: '/stuff',
      body: {
        uffstay: 'from the unktray',
      },
    });

    await router.routes[0].handleRequest(testCtx, testRouteAdapter);

    // Then  //

    expect(testCtx.response!.statusCode).toBe(409);
  });

  it('should propagate a 500 internal error from a downstream http service', async () => {
    // Given  //
    const { router } = setupTestDestination({
      '/shaky-stuff': {
        POST: {
          statusCode: 500,
          body: {
            error: 'You huffed and puffed and my poor house blew in. Thanks a lot.',
          },
        },
      },
    });

    router
      .post('/shaky-stuff')
      .httpPost('test-destination', '/shaky-stuff')
      .expectHttpSuccess()
      .extractResponseBody('content');

    // When  //

    const testCtx = makeRequestContext({
      uri: '/shaky-stuff',
      body: {
        present: 'Here, take this!',
      },
    });

    await router.routes[0].handleRequest(testCtx, testRouteAdapter);

    // Then  //

    expect(testCtx.response!.statusCode).toBe(500);
  });

  it('should propagate a successful 201 Created on a successful response', async () => {
    // Given  //
    const { router } = setupTestDestination({
      '/begin-the-story-of-creation': {
        POST: {
          statusCode: 201,
          body: {
            beginning: 'light',
          },
        },
      },
    });

    router
      .post('/create')
      .httpPost('test-destination', '/begin-the-story-of-creation')
      .expectHttpSuccess()
      .extractResponseBody('content');

    // When  //

    const testCtx = makeRequestContext({
      uri: '/begin-the-story-of-creation',
      body: {
        type: 'the world',
      },
    });

    await router.routes[0].handleRequest(testCtx, testRouteAdapter);

    // Then  //

    expect(testCtx.response!.statusCode).toBe(201);
  });
});
