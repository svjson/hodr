import { ExecutionContext, HodrError, Validator, extractPath } from '@hodr/core';
import { ZodError, ZodType } from 'zod';

const formatErrors = (error: ZodError): string => {
  const { fieldErrors, formErrors } = error.flatten();

  const fieldMessages = Object.entries(fieldErrors)
    .map(([field, messages]) => messages?.map((msg) => `Field "${field}": ${msg}`).join('\n'))
    .filter(Boolean)
    .join('\n');

  const formMessages = formErrors.map((msg) => `Form error: ${msg}`).join('\n');

  return [fieldMessages, formMessages].filter(Boolean).join('\n');
};

export const validator: Validator = {
  __type: 'validator',

  canValidate: (schema: any): boolean => {
    return schema instanceof ZodType || typeof schema.safeParse === 'function';
  },

  validate: <T = unknown>(ctx: ExecutionContext<T>, schema: any, targetPath?: string): T => {
    const parseResult = (schema as ZodType).safeParse(
      targetPath ? extractPath(ctx.payload, targetPath) : ctx.payload
    );

    if (!parseResult.success) {
      const formattedErrors = formatErrors(parseResult.error);
      ctx
        .addJournalEntry({
          id: 'zod-formatted-validation-errors',
          title: 'Zod Validation Result',
          entry: formattedErrors,
          typeHint: 'plain-text',
        })
        .addJournalEntry({
          id: 'zod-validation-errors',
          title: 'Zod Validation Error',
          entry: parseResult.error,
        });
      throw new HodrError(formattedErrors);
    }

    return ctx.payload;
  },
};
