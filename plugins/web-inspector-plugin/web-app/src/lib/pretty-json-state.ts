export const getExpansionState = (root: HTMLElement): Record<string, any> => {
  const walk = (node: HTMLElement): Record<string, any> | null => {
    const shadow = node.shadowRoot;
    if (!shadow) return null;

    const key = node.getAttribute('key') ?? '';
    let childrenObj: Record<string, any> = {};

    if (node.getAttribute('expand') === '1') {
      shadow.querySelectorAll('pretty-json').forEach((child) => {
        const result = walk(child as HTMLElement);
        if (result) {
          const [childKey, subTree] = Object.entries(result)[0];
          childrenObj[childKey] = subTree;
        }
      });
      return { [key]: childrenObj };
    }

    return null;
  };

  const result = walk(root);
  return result?.[''] ?? {};
};

export const applyExpansionState = (root: HTMLElement, state: any) => {
  if (!state) return;

  const walk = (node: HTMLElement, path: any) => {
    const shadow = node.shadowRoot;
    if (!shadow) return;

    Object.keys(path).forEach((next) => {
      const nextLmnt = shadow.querySelector(`pretty-json[key="${next}"]`);
      if (nextLmnt) {
        nextLmnt.setAttribute('expand', '1');
        walk(nextLmnt as HTMLElement, path[next]);
      }
    });
  };

  walk(root, state);
};
