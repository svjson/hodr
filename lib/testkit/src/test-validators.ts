import { HodrError } from '@hodr/core';

export const AlwaysFailValidator = <T>(_: T): T => {
  throw new HodrError('That is WILDLY invalid!');
};

export const AlwaysPassValidator = <T>(subject: T): T => {
  return subject;
};
