/** @jsx h */
import { h } from 'nano-jsx';
import { StepModel, MetaJournalEntry } from '../model';
import { toggle } from './Expandable';

interface SectionModel {
  lmnt: HTMLElement;
  data: any | null;
  hidden: boolean;
  description?: string;
  typeHint?: string;
}

const makeSection = (id: string, title: string, cardClass: string): HTMLElement => (
  <div class="payload-panel collapsible" data-id={id}>
    <div class="expandable entry-container" onClick={toggle}>
      <div class="entry">
        <h3>{title}</h3>
      </div>
      <div class="entry right">
        <span class="payload-description"></span> <span class="chevron-icon down">⮟</span>
      </div>
    </div>
    <div
      class={`card ${id === 'error' ? 'card-error' : ''} inverted step-payload ${cardClass} expandable-content mt-0`}
    ></div>
  </div>
);

const addAbsentSections = (sectionContainer: HTMLElement, step: StepModel) => {
  let lastEntry = sectionContainer.querySelector('[data-id="input"]')!;

  for (const entry of step.metadata.journal) {
    let customEntry = sectionContainer.querySelector(`[data-id="${entry.id}"]`);

    if (!customEntry) {
      customEntry = makeSection(entry.id, entry.title, 'journal-payload');
      lastEntry.parentElement?.insertBefore(customEntry, lastEntry.nextSibling);
      lastEntry = customEntry;
    }
  }
};

const makeVisualModel = (sectionContainer: HTMLElement, step: StepModel): SectionModel[] =>
  Array.prototype.slice
    .call(sectionContainer.querySelectorAll('.payload-panel'))
    .map((panelLmnt: HTMLElement) => {
      const panel: SectionModel = {
        lmnt: panelLmnt,
        data: null,
        hidden: false,
        description: '',
      };
      const id = panelLmnt.getAttribute('data-id');

      switch (id) {
        case 'input':
          panel.data = step.input;
          panel.description = step.metadata.input?.description ?? '';
          break;
        case 'output':
          panel.data = step.output;
          panel.description = step.metadata.output?.description ?? '';
          break;
        default:
          const entry = step.metadata.journal.find(
            (entry: MetaJournalEntry) => entry.id == id
          );
          panel.data = entry?.entry;
          panel.hidden = entry === undefined;
          panel.description = entry?.description;
          panel.typeHint = entry?.typeHint;
          break;
      }

      return panel;
    });

export const displayStepDetails = (sectionContainer: HTMLElement, step: StepModel) => {
  addAbsentSections(sectionContainer, step);
  const presentElements = makeVisualModel(sectionContainer, step);

  const prettyOpts = {
    expand: '50',
    'truncate-string': '5000',
  };

  presentElements.forEach(({ lmnt, data, hidden, description, typeHint }) => {
    const box = lmnt.querySelector('.step-payload') as HTMLElement;
    if (hidden) {
      lmnt.style.height = '0px';
      lmnt.style.opacity = String(0);
      lmnt.setAttribute('data-lock-height', 'true');
    } else {
      lmnt.style.height = 'auto';
      lmnt.style.opacity = String(1);
      lmnt.removeAttribute('data-lock-height');
    }

    const descLmnt = lmnt.querySelector('.payload-description')! as HTMLElement;
    if (description?.length) {
      descLmnt.innerText = description;
      descLmnt.classList.add('present');
    } else {
      descLmnt.classList.remove('present');
    }

    if (data == null || data == undefined) {
      box.classList.add('no-data');
      box.replaceChildren(<div class="italic muted">No data</div>);
    } else {
      box.classList.remove('no-data');

      let content = <div>{data}</div>;
      switch (typeHint) {
        case 'plaintext':
        case 'stacktrace':
          content = (
            <div class="scroll small">
              <code>
                <pre>{data}</pre>
              </code>
            </div>
          );
          break;
        default:
          content = (
            <div class={`scroll ${typeHint === 'string' ? '' : 'nowrap'}`}>
              <pretty-json {...prettyOpts}>{JSON.stringify(data)}</pretty-json>
            </div>
          );
      }

      box.replaceChildren(content);
    }
  });
};

export const ExecutionStepPanel = () => {
  const inputCard = makeSection('input', 'Input', 'input-payload');
  const outputCard = makeSection('output', 'Output', 'output-payload');

  return (
    <div class="execution-step-panel">
      {inputCard}
      {outputCard}
    </div>
  );
};
