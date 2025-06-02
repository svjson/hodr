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
