import { describe, it, expect } from 'vitest';
import KoaRouter from '@koa/router';
import Koa from 'koa';
import type { Hodr } from '@hodr/core';

import { FakeHttpClientResponses, makeFakeHttpClientPlugin } from '@hodr/testkit';

import { makeHodr, memoryTracker } from '@hodr/core';
import { mount } from '@hodr/koa-plugin';
import request from 'supertest';

const COMMENT_447 = {
  id: 447,
  type: 'comment',
  authorId: 'sixten@blixt.se',
  authorName: 'Sixten Blixt',
  createdAt: 1749206020217,
  comment: 'I ate all the pudding.',
};

const COMMENT_463 = {
  id: 463,
  type: 'comment',
  authorId: 'klippan.stensson@therock.se',
  authorName: 'Klippan',
  createdAt: 1749206056825,
  comment:
    'So, it was YOU!!! Why I oughtta steal your entire collection of suspiciously identical hats!',
};

interface KoaFixture {
  app: Koa;
  koaRouter: KoaRouter;
  hodr: Hodr;
}

const setupKoaFixture = (fixtureInit: (app: Koa, koaRouter: KoaRouter) => KoaFixture) => {
  const app = new Koa();
  const koaRouter = new KoaRouter();

  return fixtureInit(app, koaRouter);
};

const setupFixture = (responses: FakeHttpClientResponses) => {
  const hodr = makeHodr();

  return setupKoaFixture((app, koaRouter) => {
    hodr.use(memoryTracker({ limit: 10 }));

    hodr.destination('leasing').httpClient({
      baseUrl: 'http://leasing-service.local',
      adapter: makeFakeHttpClientPlugin(responses),
    });

    const commentsRouter = hodr.router('comments').formatError(({ error }) => {
      return {
        err: error.code,
      };
    });

    commentsRouter
      .get('/comments/:targetType/thread/:targetId')
      .httpGet('leasing', '/comments/:targetType/thread/:targetId')
      .ensureHttpOk()
      .extractResponseBody('content');

    mount(koaRouter, commentsRouter);
    app.use(koaRouter.routes());

    return { app: app, koaRouter: koaRouter, hodr: hodr };
  });
};

describe('Koa-initiated execution', () => {
  it('should return a successful response and record a finalized context', async () => {
    // Given
    const fixture = setupFixture({
      '/comments/listing/thread/8': {
        GET: {
          statusCode: 200,
          headers: {
            ContentType: 'application/json',
          },
          body: { content: { id: 8, comments: [COMMENT_463, COMMENT_447] } },
        },
      },
    });

    // When
    const response = await request(fixture.app.callback()).get('/comments/listing/thread/8');

    // Then
    const expectedPayload = {
      id: 8,
      comments: [COMMENT_463, COMMENT_447],
    };

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject(expectedPayload);

    const ctx = fixture.hodr.trackers['memory-tracker'].getRecorded()[0];

    expect(ctx).toMatchObject({
      state: 'finalized',
      steps: expect.arrayContaining([
        expect.objectContaining({
          name: 'http-req-leasing',
          state: 'finalized',
        }),
        expect.objectContaining({
          name: 'validate-http-status',
          state: 'finalized',
        }),
        expect.objectContaining({
          name: 'extract-http-body',
          state: 'finalized',
        }),
      ]),
      initialStep: expect.objectContaining({
        state: 'finalized',
      }),
      currentStep: null,
      finalizeStep: expect.objectContaining({
        state: 'finalized',
      }),
    });
  });

  it('should return a 404 response and record an error context', async () => {
    // Given
    const fixture = setupFixture({});

    // When
    const response = await request(fixture.app.callback()).get('/comments/teapots/thread/12');

    // Then
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ err: 'resource-not-found' });

    const ctx = fixture.hodr.trackers['memory-tracker'].getRecorded()[0];

    expect(ctx).toMatchObject({
      state: 'error',
      steps: expect.arrayContaining([
        expect.objectContaining({
          name: 'http-req-leasing',
          state: 'finalized',
        }),
        expect.objectContaining({
          name: 'validate-http-status',
          state: 'error',
        }),
      ]),
      initialStep: expect.objectContaining({
        state: 'finalized',
      }),
      currentStep: null,
      finalizeStep: expect.objectContaining({
        state: 'error',
      }),
    });
  });

  it('should return a 404 response and record an error context', async () => {
    // Given
    const fixture = setupFixture({
      '/comments/listing/thread/8': {
        GET: { statusCode: 500, body: {}, headers: {} },
      },
    });

    // When
    const response = await request(fixture.app.callback()).get('/comments/listing/thread/8');

    // Then
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ err: 'internal-error' });

    const ctx = fixture.hodr.trackers['memory-tracker'].getRecorded()[0];

    expect(ctx).toMatchObject({
      state: 'error',
      steps: expect.arrayContaining([
        expect.objectContaining({
          name: 'http-req-leasing',
          state: 'finalized',
        }),
        expect.objectContaining({
          name: 'validate-http-status',
          state: 'error',
        }),
      ]),
      initialStep: expect.objectContaining({
        state: 'finalized',
      }),
      currentStep: null,
      finalizeStep: expect.objectContaining({
        state: 'error',
      }),
    });
  });
});
