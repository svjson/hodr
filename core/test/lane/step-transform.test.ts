import { HttpRequest } from '@hodr/core';
import { describe, expect, it } from 'vitest';
import { HodrContext } from '../../src/context/context';
import { TransformStep } from '../../src/lane/step';
import { Hodr } from '../../src/types';

type Stuff = { type: string };
type StuffCollection = { stuff: Stuff[] };

const makeDummyContext = <Payload>(params: any) => {
  return new HodrContext<Payload>({
    origin: params.origin ?? {
      name: 'sharks',
      input: 'batteries',
      variant: 'tanks',
    },
    lane: params.lane ?? {
      root: function (): Hodr {
        throw new Error('Function not implemented.');
      },
      steps: [],
    },
    payload: params.payload,
    initialStep: params.initialStep ?? {
      type: 'initial',
      name: '',
      state: 'finalized',
      input: undefined,
      metadata: {
        input: {},
        output: {},
        journal: [],
      },
      startedAt: 0,
    },
    currentStep: params.currentStep ?? {
      name: '',
      state: 'pending',
      input: undefined,
      metadata: {
        input: {},
        output: {},
        journal: [],
      },
      startedAt: 0,
    },
    finalizeStep: params.finalizeStep ?? null,
    metadata: params.metadata ?? {},
    inputTopic: params.inputTopic ?? 'things',
  });
};

describe('TransformStep', () => {
  it('should accept a function taking only a payload', async () => {
    // Given
    const ctx = makeDummyContext<StuffCollection>({
      payload: {
        stuff: [{ type: 'Bouillabaisse' }, { type: 'Hootenanny' }, { type: 'Cowbell' }],
      },
    });

    const step = new TransformStep((payload: StuffCollection) => {
      return {
        size: payload.stuff.length,
      } as any;
    });

    // When
    const result = await step.execute(ctx);

    // Then
    expect(result).toMatchObject({
      size: 3,
    });
  });

  it('should successfully transform a HttpRequest', async () => {
    // Given
    const ctx = makeDummyContext<HttpRequest>({
      payload: {
        method: 'GET',
        uri: '/comments/location/thread/384',
        params: { targetType: 'location', targetId: '384' },
        session: { account: { id: 1234, name: 'Tarzan' } },
        body: {
          type: 'warning',
          comment: 'Beware! Bear-infested area!',
        },
      } as HttpRequest,
    });

    const step = new TransformStep<HttpRequest, any>(
      async ({ body, session, params }) => ({
        threadId: { ...params },
        comment: {
          authorId: session!.account.id,
          authorName: session!.account.name,
          type: body.type,
          comment: body.comment,
        },
      })
    );

    // When
    const result = await step.execute(ctx);

    // Then
    expect(result).toEqual({
      threadId: { targetType: 'location', targetId: '384' },
      comment: {
        authorId: 1234,
        authorName: 'Tarzan',
        type: 'warning',
        comment: 'Beware! Bear-infested area!',
      },
    });
  });

  it('should allow a non-async transform-function', async () => {
    // Given
    const ctx = makeDummyContext<HttpRequest>({
      payload: {
        method: 'GET',
        uri: '/comments/location/thread/384',
        params: { targetType: 'location', targetId: '384' },
        session: { account: { id: 1234, name: 'Tarzan' } },
        body: {
          type: 'warning',
          comment: 'Beware! Bear-infested area!',
        },
      } as HttpRequest,
    });

    const step = new TransformStep<HttpRequest, any>(({ body, session, params }) => ({
      threadId: { ...params },
      comment: {
        authorId: session!.account.id,
        authorName: session!.account.name,
        type: body.type,
        comment: body.comment,
      },
    }));

    // When
    const result = await step.execute(ctx);

    // Then
    expect(result).toEqual({
      threadId: { targetType: 'location', targetId: '384' },
      comment: {
        authorId: 1234,
        authorName: 'Tarzan',
        type: 'warning',
        comment: 'Beware! Bear-infested area!',
      },
    });
  });
});
