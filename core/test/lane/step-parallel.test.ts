import { describe, it, expect } from 'vitest';

import { makeHodr } from '../../src/hodr';
import { ParallelStep, TransformStep } from '../../src/lane/step';
import { makeDummyContext } from '../fixture';

describe('ParallelStep', () => {
  it('should execute configured sublanes and yield the combined output', async () => {
    // Given
    const hodr = makeHodr();
    const mainStep = new ParallelStep<string, [number, boolean, string]>(
      () => hodr,
      [
        {
          root: () => hodr,
          steps: [new TransformStep<string, number>((payload) => parseInt(payload))],
        },
        {
          root: () => hodr,
          steps: [new TransformStep<string, boolean>((payload) => Boolean(payload))],
        },
        {
          root: () => hodr,
          steps: [new TransformStep<string, string>((payload) => payload.repeat(2))],
        },
      ]
    );
    const ctx = makeDummyContext<string>({ payload: '12345' });

    // When
    const output = await mainStep.execute(ctx);

    // Then
    expect(output).toEqual([12345, true, '1234512345']);
  });
});
