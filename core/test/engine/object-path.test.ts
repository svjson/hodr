import { describe, it, expect } from 'vitest';
import { compile, CompiledExpression, parse } from '../../src/engine/object-path';

describe('Object Path', () => {
  it('can extract objects by dot notation: "body.comments"', () => {
    const ast = parse('body.comments');
    const evalFn: CompiledExpression = compile(ast);
    expect(
      evalFn(
        {
          body: {
            comments: [
              { id: 523, comment: 'Hehu!' },
              { id: 655, comment: 'Nah!' },
            ],
          },
        },
        {}
      )
    ).toEqual([
      { id: 523, comment: 'Hehu!' },
      { id: 655, comment: 'Nah!' },
    ]);
  });

  it('can compare array lengths: "comments.length>0"', () => {
    const ast = parse('comments.length>0');
    const evalFn: CompiledExpression = compile(ast);
    expect(
      evalFn(
        {
          comments: [
            { id: 523, comment: 'Hehu!' },
            { id: 655, comment: 'Nah!' },
          ],
        },
        {}
      )
    ).toBe(true);

    expect(
      evalFn(
        {
          comments: [],
        },
        {}
      )
    ).toBe(false);
  });

  it('can extract array objects based on property comparison with context variable: "comments[id=commentId]"', () => {
    const ast = parse('comments[id=commentId]');
    const evalFn: CompiledExpression = compile(ast);

    const obj = {
      comments: [
        { id: 523, comment: 'Hehu!' },
        { id: 655, comment: 'Nah!' },
      ],
    };

    expect(evalFn(obj, { commentId: 655 })).toMatchObject({ id: 655, comment: 'Nah!' });
    expect(evalFn(obj, { commentId: 523 })).toMatchObject({ id: 523, comment: 'Hehu!' });
    expect(evalFn(obj, { commentId: 123 })).toBeFalsy();
  });

  it('can coerce string-encoded numbers using type hints', () => {
    const ast = parse('comments[id=#commentId]');
    const evalFn: CompiledExpression = compile(ast);

    const obj = {
      comments: [
        { id: 523, comment: 'Hehu!' },
        { id: 655, comment: 'Nah!' },
      ],
    };

    const reporter = (op: any) => {};

    expect(evalFn(obj, { commentId: '655' }, reporter)).toMatchObject({
      id: 655,
      comment: 'Nah!',
    });
    expect(evalFn(obj, { commentId: '523' }, reporter)).toMatchObject({
      id: 523,
      comment: 'Hehu!',
    });
    expect(evalFn(obj, { commentId: '123' }, reporter)).toBeFalsy();
  });
});
