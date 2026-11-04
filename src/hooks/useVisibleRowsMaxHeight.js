import { useLayoutEffect, useRef, useState } from 'react';

export function useVisibleRowsMaxHeight(rowCount, content, loading) {
  const ref = useRef(null);
  const [maxHeight, setMaxHeight] = useState('none');

  useLayoutEffect(() => {
    const container = ref.current;

    const measure = () => {
      const table = container?.querySelector('table');
      const rows = table?.tBodies[0]?.rows;
      if (!table || !rows || rows.length <= rowCount) {
        setMaxHeight('none');
        return;
      }
      const style = getComputedStyle(container);
      const borders = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
      const scrollbarHeight = container.offsetHeight - container.clientHeight - borders;
      const boxExtra = scrollbarHeight + (style.boxSizing === 'border-box' ? borders : 0);
      const top = table.getBoundingClientRect().top;
      const lastVisibleBottom = rows[rowCount - 1].getBoundingClientRect().bottom;
      const footerHeight = table.tFoot?.getBoundingClientRect().height ?? 0;
      setMaxHeight(Math.ceil(lastVisibleBottom - top + footerHeight + boxExtra));
    };

    measure();

    // Wrapping text makes rows taller or shorter when the width changes, so measure again on width changes only
    // (reacting to height would loop, since setting maxHeight changes the height).
    if (!container || typeof ResizeObserver === 'undefined') return undefined;
    let lastWidth = container.clientWidth;
    const observer = new ResizeObserver(() => {
      if (container.clientWidth === lastWidth) return;
      lastWidth = container.clientWidth;
      measure();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [rowCount, content, loading]);

  return [ref, maxHeight];
}
