export const formatDate = (epoch: number) => {
  return new Date(epoch).toISOString().split(/T|\./).slice(0, 2).join(' ');
};

export const formatTime = (epoch: number) => {
  return new Date(epoch).toISOString().split(/T|\./)[1];
};

export const juxt = <T = any, U = any>(left: T[], right: U[]): [T, U | null][] =>
  left.map((p, i) => [p, i < left.length ? right[i] : null]);
