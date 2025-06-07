import { describe, it, expect } from 'vitest';
import { resolveParams } from '../../src/destination/http';

describe('resolveParams', () => {
  it('resolves path params from object path', () => {
    // Given
    const obj = {
      threadId: { targetType: 'listing', targetId: '88' },
    };

    const pathParams = resolveParams(obj, {
      pathParams: 'threadId',
    });

    expect(pathParams).toMatchObject({
      targetType: 'listing',
      targetId: '88',
    });
  });
});
