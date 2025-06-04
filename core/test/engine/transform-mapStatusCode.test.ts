import { describe, it, expect } from 'vitest';
import { mapStatusCode, StatusCondMap } from '@hodr/core';

describe('mapStatusCode()', () => {
  it('should return input statusCode on no matching clause', () => {
    // Given
    const statusMap: StatusCondMap = [
      [511, 500],
      [[500, 505], 500],
    ];

    // Then
    expect(mapStatusCode(404, statusMap)).toBe(404);
    expect(mapStatusCode(200, statusMap)).toBe(200);
    expect(mapStatusCode(510, statusMap)).toBe(510);
    expect(mapStatusCode(506, statusMap)).toBe(506);
  });

  it('should return mapped statusCode on matching clause', () => {
    // Given
    const statusMap: StatusCondMap = [
      [511, 500],
      [[500, 505], 500],
    ];

    // Then
    expect(mapStatusCode(511, statusMap)).toBe(500);
    expect(mapStatusCode(500, statusMap)).toBe(500);
    expect(mapStatusCode(501, statusMap)).toBe(500);
    expect(mapStatusCode(502, statusMap)).toBe(500);
    expect(mapStatusCode(503, statusMap)).toBe(500);
    expect(mapStatusCode(504, statusMap)).toBe(500);
    expect(mapStatusCode(505, statusMap)).toBe(500);
  });

  it('should prefer explicit status code over range membership', () => {
    // Given
    const statusMap: StatusCondMap = [
      [[400, 411], 500],
      [404, 200],
    ];

    // Then
    expect(mapStatusCode(404, statusMap)).toBe(200);
  });
});
