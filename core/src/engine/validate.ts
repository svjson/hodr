import { ExecutionContext } from '../context';
import type { HttpResponse, HttpStatusCode, HttpStatusErrorCode } from '../destination';
import { httpErrorStatusToInternal } from '../destination';
import { HodrStep } from '../lane';
import { HodrError } from './types';

export type HttpStatusPattern = number | HttpStatusRange;

export class HttpStatusRange {
  constructor(
    public readonly from: number,
    public readonly to: number
  ) {}

  includes(status: number): boolean {
    return status >= this.from && status <= this.to;
  }
}

const matchStatus = (status: number, pattern: HttpStatusPattern): boolean => {
  if (typeof pattern === 'number') {
    return status === pattern;
  }
  if (pattern instanceof HttpStatusRange) {
    return pattern.includes(status);
  }
  return false;
};

export const httpStatusMatcher = (
  ...statusPatterns: HttpStatusPattern[]
): HodrStep<HttpResponse, HttpResponse> => {
  return {
    name: 'validate-http-status',
    execute: (ctx: ExecutionContext<HttpResponse>): Promise<HttpResponse> => {
      const statusCode: HttpStatusCode = ctx.payload.statusCode;

      for (const pattern of statusPatterns) {
        if (matchStatus(statusCode, pattern)) {
          return Promise.resolve(ctx.payload);
        }
      }

      throw new HodrError(
        `Response Status code ${statusCode} not accepted`,
        { http: { statusCode: statusCode } },
        httpErrorStatusToInternal[statusCode as HttpStatusErrorCode] ?? 'internal-error'
      );
    },
  };
};
