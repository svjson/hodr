import { StepExecution, Tracker } from '@hodr/core';

export const dumpLastExecution = (tracker: Tracker): void => {
  tracker
    .getRecorded()
    .at(-1)
    ?.steps.forEach((s: StepExecution) => {
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
