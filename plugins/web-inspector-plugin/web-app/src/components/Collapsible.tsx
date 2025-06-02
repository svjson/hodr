const resizeObserver = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const el = entry.target as HTMLElement;
    if (el.hasAttribute('data-transition')) {
      continue;
    }
    const newHeight = el.hasAttribute('data-lock-height') ? 0 : el.offsetHeight;
    const prevHeight = el.getAttribute('prev-height') ?? el.clientHeight;

    if (String(newHeight) === prevHeight) {
      continue;
    }

    // Apply smooth transition
    el.setAttribute('data-transition', 'resize');
    el.style.height = prevHeight + 'px';
    setTimeout(() => {
      el.style.height = newHeight + 'px';
    }, 1);

    el.setAttribute('prev-height', String(newHeight));

    // Optionally clear it after animation
    setTimeout(() => {
      el.removeAttribute('data-transition');
      if (!el.hasAttribute('data-lock-height')) {
        el.style.height = '';
      }
    }, 300);
  }
});

const mutationObserver = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (!(node instanceof HTMLElement)) continue;

      if (node.classList.contains('collapsible') && !node.hasAttribute('data-observed')) {
        node.setAttribute('data-observed', 'true');
        resizeObserver.observe(node);
      }

      // Also check descendants
      const children = node.querySelectorAll('.collapsible');
      children.forEach((child) => resizeObserver.observe(child));
    }
  }
});

mutationObserver.observe(document.body, {
  childList: true,
  subtree: true,
});
