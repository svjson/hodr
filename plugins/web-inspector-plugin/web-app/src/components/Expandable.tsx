export const toggle = (e: MouseEvent) => toggleExpandable(e.currentTarget as HTMLElement);

export const toggleExpandable = (lmnt: HTMLElement): HTMLElement | null => {
  const chevronIcon = lmnt.querySelector('.chevron-icon');

  if (!chevronIcon) {
    return null;
  }
  chevronIcon.classList.toggle('down');
  chevronIcon.classList.toggle('up');

  const content = lmnt.parentElement!.querySelector('.expandable-content') as HTMLElement;
  if (!content) {
    return null;
  }
  content.classList.toggle('hidden');

  return content;
};
