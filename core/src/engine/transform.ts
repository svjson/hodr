import { ExtractionMap, StatusCondEntry, StatusCondMap } from './types';

import opath, { CompiledExpression, OperationReporter } from './object-path';
import { HttpStatusCode } from '../destination';

export const extractPath = (
  obj: any,
  expression: string,
  symbolContext: Record<string, any> = {},
  reporter?: OperationReporter
): any => {
  if (!obj || !expression) {
    return obj;
  }

  const fn: CompiledExpression = opath.parseAndCompile(expression);

  return fn(obj, symbolContext, reporter);
};

export const extractMap = (
  obj: any,
  directive: ExtractionMap | string,
  symbolContext: Record<string, any> = {},
  reporter?: OperationReporter
): any => {
  if (typeof directive === 'string') {
    return extractPath(obj, directive, symbolContext, reporter);
  }

  const extracted: Record<string, any> = {};
  for (const [key, path] of Object.entries(directive)) {
    if (typeof path === 'string') {
      extracted[key] = extractPath(obj, path, symbolContext, reporter);
    } else {
      extracted[key] = extractMap(obj, path, symbolContext, reporter);
    }
  }
  return extracted;
};

export const mapStatusCode = (
  statusCode: HttpStatusCode,
  map: StatusCondMap
): HttpStatusCode => {
  let candidate: StatusCondEntry | null = null;

  for (const clause of map) {
    if (typeof clause[0] === 'number' && clause[0] === statusCode) {
      candidate = clause;
      break;
    } else if (
      candidate == null &&
      Array.isArray(clause[0]) &&
      clause[0].length == 2 &&
      statusCode >= clause[0][0] &&
      statusCode <= clause[0][1]
    ) {
      candidate = clause;
    }
  }

  return candidate ? candidate[1] : statusCode;
};
