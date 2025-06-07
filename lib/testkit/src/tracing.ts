import { ExecutionContext, Hodr, StepExecution, Tracker } from '@hodr/core';

const getTracker = (source: Tracker | Hodr): Tracker => {
  return typeof (source as Hodr).trackers === 'object'
    ? (source as Hodr).trackers['memory-tracker']
    : (source as Tracker);
};

export const getLastExecution = (source: Tracker | Hodr): ExecutionContext<any> => {
  return getTracker(source).getRecorded().at(-1)!;
};

export const dumpLastExecution = (source: Tracker | Hodr): void => {
  getLastExecution(source).steps.forEach((s: StepExecution) => {
    console.log(`--------- ${s.name} -----------------------------------------`);
    console.log(s);
    console.log('-------> INPUT');
    console.log(s.input);
    console.log('<------- OUTPUT');
    console.log(s.output);
    console.log('-------- <JOURNAL>');
    s.metadata.journal.forEach((e) => {
      console.log('### ' + e.title);
      console.log(e.entry);
    });
    console.log('-------- </JOURNAL>');
  });
};
