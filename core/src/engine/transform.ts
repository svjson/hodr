import {
  ExtractionMap,
  ObjectPathReference,
  StatusCondEntry,
  StatusCondMap,
} from './types';

export const extractPath = (obj: any, pathRef?: ObjectPathReference): any => {
  if (!obj || !pathRef) {
    return obj;
  }

  const parts: string[] = typeof pathRef === 'string' ? pathRef.split('.') : pathRef;

  return parts.reduce<unknown>((result, key) => {
    if (result == null || typeof result !== 'object') return undefined;
    return (result as Record<string, unknown>)[key];
  }, obj);
};

export const extractMap = (obj: any, directive: ExtractionMap | string): any => {
  if (typeof directive === 'string') {
    return extractPath(obj, directive);
  }

  const extracted: Record<string, any> = {};
  for (const [key, path] of Object.entries(directive)) {
    if (typeof path === 'string') {
      extracted[key] = extractPath(obj, path);
    } else {
      extracted[key] = extractMap(obj, path);
    }
  }
  return extracted;
};

export const mapStatusCode = (statusCode: number, map: StatusCondMap): number => {
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
