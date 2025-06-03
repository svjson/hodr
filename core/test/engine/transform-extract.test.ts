import { describe, it, expect } from 'vitest';
import { extractMap } from '@hodr/core';

describe('extractMap', () => {
  it('should extract existing fields in accordance with an ExtractionMap.', () => {
    // Given
    const sourceObject = {
      params: { targetType: 'listing', targetId: '57' },
      session: {
        account: {
          id: '66207d60-40ba-11f0-947b-a686bd02fbe0',
          name: 'Benny Boxare',
          email: 'benny@boxare.se',
          roles: ['ADMIN', 'DEFAULT', 'APPROVAL'],
          isActive: true,
        },
      },
      body: {
        type: 'WARNING',
        comment: 'I _am_ the walrus!',
      },
    };

    // When
    const result = extractMap(sourceObject, {
      threadId: 'params',
      account: 'session.account',
      comment: 'body',
    });

    // Then
    expect(result).toMatchObject({
      threadId: { targetType: 'listing', targetId: '57' },
      account: {
        id: '66207d60-40ba-11f0-947b-a686bd02fbe0',
        name: 'Benny Boxare',
        email: 'benny@boxare.se',
        roles: ['ADMIN', 'DEFAULT', 'APPROVAL'],
        isActive: true,
      },
      comment: {
        type: 'WARNING',
        comment: 'I _am_ the walrus!',
      },
    });
  });

  it('should extract a single named field', () => {
    // Given
    const sourceObject = {
      params: { targetType: 'listing', targetId: '57' },
      session: {
        account: {
          id: '66207d60-40ba-11f0-947b-a686bd02fbe0',
          name: 'Benny Boxare',
          email: 'benny@boxare.se',
          roles: ['ADMIN', 'DEFAULT', 'APPROVAL'],
          isActive: true,
        },
      },
      body: {
        type: 'WARNING',
        comment: 'I _am_ the walrus!',
      },
    };

    // When
    const result = extractMap(sourceObject, 'body.comment');

    // Then
    expect(result).toEqual('I _am_ the walrus!');
  });
});
