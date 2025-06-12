import { describe, it, expect } from 'vitest';
import { ExecutionContext } from '@hodr/core';
import {
  makeRequestContext,
  testRouteAdapter,
  getLastExecution,
  setupTestDestination,
} from '@hodr/testkit';

type Comment = {
  id: number;
  type: 'COMMENT' | 'WARNING' | 'STOP';
  createdAt: Date;
  authorName: string;
  authorId: string;
  comment: string;
};

describe('Route ExecutionContext atoms', () => {
  it('should store all incoming request parameters as vars in the execution context', async () => {
    // Given  //
    const { router, hodr } = setupTestDestination({});

    router
      .delete('/comments/:targetType/thread/:targetId/:commentId')
      .httpDelete('test-destination', '/comments/:targetType/thread/:targetId/:commentId')
      .ensureHttpSuccess();

    // When  //
    const testCtx = makeRequestContext({
      uri: '/comments/listing/thread/5/255',
      session: {
        account: { id: 999, name: 'konny.kruka@julgran.se', username: 'Konny K' },
      },
      params: { targetType: 'listing', targetId: '5', commentId: '255' },
    });

    await router.routes[0].handleRequest(testCtx, testRouteAdapter);

    // Then  //
    const ctx: ExecutionContext<any> = getLastExecution(hodr);

    expect(ctx.atoms()).toMatchObject({
      targetType: 'listing',
      targetId: '5',
      commentId: '255',
      params: {
        targetType: 'listing',
        targetId: '5',
        commentId: '255',
      },
      session: {
        account: { id: 999, name: 'konny.kruka@julgran.se', username: 'Konny K' },
      },
      account: { id: 999, name: 'konny.kruka@julgran.se', username: 'Konny K' },
    });
  });

  it.each([
    [255, 204],
    [100, 404],
    [259, 401],
  ])(
    'should use atoms to resolve named bindings and attempt to delete comment %i, resulting in HTTP status %i',
    async (commentIdToDelete, expectedStatus) => {
      // Given  //
      const { router, hodr } = setupTestDestination({
        '/comments/listing/thread/5': {
          GET: {
            statusCode: 200,
            body: {
              content: {
                id: {
                  targetType: 'listing',
                  targetId: 5,
                },
                comments: [
                  {
                    id: 264,
                    type: 'COMMENT',
                    authorName: 'Konny K',
                    authorId: 'konny.kruka@julgran.se',
                    comment:
                      "You're taking this out of context. I never _explicitly_ said they were employees.",
                    createdAt: new Date('2025-06-06T12:36:00Z'),
                  },
                  {
                    id: 259,
                    type: 'COMMENT',
                    authorName: 'BeakLad89',
                    authorId: 'weeweebird@trees.com',
                    comment:
                      'So... were the ferrets trained or just naturally good at spreadsheets?',
                    createdAt: new Date('2025-06-06T12:34:00Z'),
                  },
                  {
                    id: 255,
                    type: 'COMMENT',
                    authorName: 'Konny K',
                    authorId: 'konny.kruka@julgran.se',
                    comment:
                      'Fun fact: if you file your taxes through a network of semi-domesticated ferrets, the IRS technically can’t trace you. Learned that at a party in a NYC penthouse.',
                    createdAt: new Date('2025-06-06T12:30:00Z'),
                  },
                ],
              },
            },
          },
        },
        '/comments/listing/thread/5/255': {
          DELETE: {
            statusCode: 204,
            body: null,
          },
        },
      });

      router
        .delete('/comments/:targetType/thread/:targetId/:commentId')
        .httpGet('test-destination', '/comments/:targetType/thread/:targetId')
        .ensureHttpSuccess()

        .extractResponseBody('content.comments')
        .transform((comments, _, { commentId }) =>
          comments.find((c: Comment) => c.id === Number(commentId))
        )
        .ensureValue('resource-not-found')
        .ensure((c, _, { account }) => c.authorId === account.name, 'unauthorized')

        .httpDelete(
          'test-destination',
          '/comments/:targetType/thread/:targetId/:commentId'
        )
        .ensureHttpSuccess();

      // When  //
      const testCtx = makeRequestContext({
        method: 'DELETE',
        uri: `/comments/listing/thread/5/${commentIdToDelete}`,
        session: {
          account: { id: 999, name: 'konny.kruka@julgran.se', username: 'Konny K' },
        },
        params: {
          targetType: 'listing',
          targetId: '5',
          commentId: `${commentIdToDelete}`,
        },
      });

      await router.routes[0].handleRequest(testCtx, testRouteAdapter);

      // Then  //
      expect(testCtx.response!.statusCode).toBe(expectedStatus);
    }
  );

  it.each([
    [255, 204],
    [100, 404],
    [259, 401],
  ])(
    'can use object-paths to attempt to delete comment %i, resulting in HTTP status %i',
    async (commentIdToDelete, expectedStatus) => {
      // Given  //
      const { router, hodr } = setupTestDestination({
        '/comments/listing/thread/5': {
          GET: {
            statusCode: 200,
            body: {
              content: {
                id: {
                  targetType: 'listing',
                  targetId: 5,
                },
                comments: [
                  {
                    id: 264,
                    type: 'COMMENT',
                    authorName: 'Konny K',
                    authorId: 'konny.kruka@julgran.se',
                    comment:
                      "You're taking this out of context. I never _explicitly_ said they were employees.",
                    createdAt: new Date('2025-06-06T12:36:00Z'),
                  },
                  {
                    id: 259,
                    type: 'COMMENT',
                    authorName: 'BeakLad89',
                    authorId: 'weeweebird@trees.com',
                    comment:
                      'So... were the ferrets trained or just naturally good at spreadsheets?',
                    createdAt: new Date('2025-06-06T12:34:00Z'),
                  },
                  {
                    id: 255,
                    type: 'COMMENT',
                    authorName: 'Konny K',
                    authorId: 'konny.kruka@julgran.se',
                    comment:
                      'Fun fact: if you file your taxes through a network of semi-domesticated ferrets, the IRS technically can’t trace you. Learned that at a party in a NYC penthouse.',
                    createdAt: new Date('2025-06-06T12:30:00Z'),
                  },
                ],
              },
            },
          },
        },
        '/comments/listing/thread/5/255': {
          DELETE: {
            statusCode: 204,
            body: null,
          },
        },
      });

      router
        .delete('/comments/:targetType/thread/:targetId/:commentId')
        .httpGet('test-destination', '/comments/:targetType/thread/:targetId')
        .ensureHttpSuccess()

        .extractResponseBody('content')
        .extract('comments[id=#commentId]')
        .ensureValue('resource-not-found')
        .ensure('authorId=account.name', 'unauthorized')

        .httpDelete(
          'test-destination',
          '/comments/:targetType/thread/:targetId/:commentId'
        )
        .ensureHttpSuccess();

      // When  //
      const testCtx = makeRequestContext({
        method: 'DELETE',
        uri: `/comments/listing/thread/5/${commentIdToDelete}`,
        session: {
          account: { id: 999, name: 'konny.kruka@julgran.se', username: 'Konny K' },
        },
        params: {
          targetType: 'listing',
          targetId: '5',
          commentId: `${commentIdToDelete}`,
        },
      });

      await router.routes[0].handleRequest(testCtx, testRouteAdapter);

      // Then  //
      expect(testCtx.response!.statusCode).toBe(expectedStatus);
    }
  );
});
