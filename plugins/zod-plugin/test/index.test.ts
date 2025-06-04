import { describe, it, expect } from 'vitest';
import { z } from 'zod';

import { validator } from '@hodr/zod-plugin';
import {
  ExecutionContext,
  FinalizeStepExecution,
  Hodr,
  HodrError,
  MetaJournalEntry,
} from '@hodr/core';

export const CommentTypeSchema = z.enum(['COMMENT', 'WARNING', 'STOP']);

export const CommentSchema = z.object({
  id: z.number().int(),
  type: CommentTypeSchema,
  authorName: z.string(),
  authorId: z.string(),
  comment: z.string(),
  createdAt: z.date(),
});

describe('Zod Validator', () => {
  describe('canValidate()', () => {
    it('should respond false to non-Zod schemas', () => {
      expect(validator.canValidate(false)).toBe(false);
      expect(validator.canValidate('kangaroos?')).toBe(false);
      expect(validator.canValidate({ validate: (_: any): string => 'Funky!' })).toBe(false);
      expect(validator.canValidate(1234)).toBe(false);
    });

    it('should respond true to a Zod schema', () => {
      expect(validator.canValidate(CommentTypeSchema)).toBe(true);
      expect(validator.canValidate(CommentSchema)).toBe(true);
    });
  });

  describe('validate()', () => {
    it('should pass validation for a well-formed object and return the validated object', () => {
      // Given
      const object = {
        id: 572,
        type: 'WARNING',
        authorName: 'Odie',
        authorId: 'e485055c-4155-11f0-8355-a686bd02fbe0',
        comment: 'Beware of cat!',
        createdAt: new Date(),
      };
      const ctx = makeCtx(object);

      // When
      const result = validator.validate(ctx, CommentSchema, ctx.payload);

      // Then
      expect(result).toMatchObject(object);
    });

    it('should fail validation for an object with a missing field and throw an Exception', () => {
      // Given
      const object = {
        id: 572,
        type: 'WARNING',
        authorName: 'Odie',
        authorId: 'e485055c-4155-11f0-8355-a686bd02fbe0',
        comment: 'Beware of cat!',
      };
      const ctx = makeCtx(object);

      let result: any = null;

      // When-Then
      expect(() => {
        result = validator.validate(ctx, CommentSchema, object);
      }).toThrowError(new HodrError('Field "createdAt": Required'));

      // Then
      expect(result).toBeNull();
      expect(ctx.currentStep.metadata.journal.length).toBe(2);
    });
  });
});

const makeCtx = <T>(payload: T): ExecutionContext<T> => {
  return {
    state: 'error',
    steps: [],
    addJournalEntry: function (entry: MetaJournalEntry): ExecutionContext<T> {
      this.currentStep.metadata.journal.push(entry);
      return this;
    },
    beginFinalizationStep: function (
      stepName: string,
      status?: 'pending' | 'error' | 'finalized',
      input?: any
    ): FinalizeStepExecution {
      throw new Error('Function not implemented.');
    },
    origin: {
      name: 'test-origin',
      input: 'test-input',
      variant: 'test-variant',
    },
    lane: {
      root: function (): Hodr {
        throw new Error('Function not implemented.');
      },
      steps: [],
    },
    initialStep: {
      type: 'initial',
      name: '',
      state: 'error',
      input: undefined,
      metadata: {
        input: {},
        output: {},
        journal: [],
      },
      startedAt: 0,
    },
    currentStep: {
      name: 'test-step',
      state: 'pending',
      input: {},
      metadata: {
        input: {},
        output: {},
        journal: [],
      },
      startedAt: 0,
    },
    payload: payload,
    metadata: {},
    inputTopic: '',
  };
};
