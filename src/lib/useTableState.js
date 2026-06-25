import { useState, useRef, useCallback } from 'react';

function load(id, defaults) {
  try {
    const s = JSON.parse(localStorage.getItem(`qa_tbl_${id}`) || 'null');
    if (!s?.order) return defaults;
    const map = Object.fromEntries(defaults.map(c => [c.k, c]));
    const out = s.order.filter(k => map[k]).map(k => ({ ...map[k], w: s.widths?.[k] || map[k].w }));
    defaults.forEach(c => { if (!out.find(o => o.k === c.k)) out.push(c); });
    return out;
  } catch { return defaults; }
}

function persist(id, cols) {
  try {
    localStorage.setItem(`qa_tbl_${id}`, JSON.stringify({
      order: cols.map(c => c.k),
      widths: Object.fromEntries(cols.map(c => [c.k, c.w])),
    }));
  } catch {}
}

export function useTableState(tableId, initialCols) {
  const [cols, setCols] = useState(() => load(tableId, initialCols));
  const [dragOver, setDragOver] = useState(null);
  const dragKey = useRef(null);

  // Resize: drag the right edge of a column header
  const startResize = useCallback((key, e) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    // Measure actual th width from the DOM for accuracy
    const th = e.currentTarget.closest('th');
    const startW = th ? th.getBoundingClientRect().width : 100;

    const onMove = (ev) => {
      const newW = Math.max(50, startW + (ev.clientX - startX));
      setCols(prev => prev.map(c => c.k === key ? { ...c, w: `${newW}px` } : c));
    };
    const onUp = () => {
      setCols(prev => { persist(tableId, prev); return prev; });
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [tableId]);

  // Reorder: drag a column header over another to swap
  const drag = {
    start: (k) => { dragKey.current = k; },
    over:  (e, k) => { e.preventDefault(); if (dragKey.current !== k) setDragOver(k); },
    leave: () => setDragOver(null),
    drop:  (k) => {
      setDragOver(null);
      const from = dragKey.current;
      dragKey.current = null;
      if (!from || from === k) return;
      setCols(prev => {
        const fi = prev.findIndex(c => c.k === from);
        const ti = prev.findIndex(c => c.k === k);
        if (fi < 0 || ti < 0) return prev;
        const next = [...prev];
        const [m] = next.splice(fi, 1);
        next.splice(ti, 0, m);
        persist(tableId, next);
        return next;
      });
    },
    end: () => { dragKey.current = null; setDragOver(null); },
  };

  return { cols, startResize, drag, dragOver };
}
