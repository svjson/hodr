import { describe, it, expect } from 'vitest';
import { Hodr, makeHodr } from '@hodr/core';

describe('Function invocation', () => {
  it('should return the output the last step', async () => {
    const hodr: Hodr = makeHodr();

    hodr
      .module('orders')
      .function('calculateSum')
      .extract('items')
      .transform((payload: any) => {
        return payload.reduce((sum: number, item: any) => {
          return sum + item.price;
        }, 0);
      });

    const calculateSum = hodr.module('orders').getFunction<any, number>('calculateSum');

    const total = await calculateSum({
      orderId: 12345,
      items: [
        {
          itemId: 834,
          price: 552.5,
        },
        {
          itemId: 999,
          price: 320.0,
        },
        {
          itemId: 911,
          price: 1782.2,
        },
      ],
    });

    expect(total).toBe(552.5 + 320.0 + 1782.2);
  });
});
