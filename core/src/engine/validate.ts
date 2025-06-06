import { ExecutionContext } from '../context';
import { HttpResponse } from '../destination';
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

const statusToInternal: Record<number, string> = {
  400: 'bad-request',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'resource-not-found',
  405: 'not-allowed',
  409: 'conflict',
  500: 'internal-error',
};

export const httpStatusMatcher = (
  ...statusPatterns: HttpStatusPattern[]
): HodrStep<HttpResponse, HttpResponse> => {
  return {
    name: 'validate-http-status',
    execute: (ctx: ExecutionContext<HttpResponse>): Promise<HttpResponse> => {
      const statusCode: number = ctx.payload.statusCode;

      for (const pattern of statusPatterns) {
        if (matchStatus(statusCode, pattern)) {
          return Promise.resolve(ctx.payload);
        }
      }
      throw new HodrError(
        `Response Status code ${statusCode} not accepted`,
        { http: { statusCode: statusCode } },
        statusToInternal[statusCode] ?? 'internal-error'
      );
    },
  };
};
