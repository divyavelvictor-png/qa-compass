import { useState, useRef, useEffect } from 'react';

/**
 * TagCell — shows tags inline in a table cell.
 * Clicking opens an absolute-positioned edit overlay so the table
 * layout is never disturbed regardless of column width.
 */
export default function TagCell({ id, tags = [], onSave }) {
  const [open, setOpen]   = useState(false);
  const [items, setItems] = useState(tags);
  const [newVal, setNewVal] = useState('');
  const ref = useRef(null);

  // Sync when parent pushes new tags (e.g. after realtime update)
  useEffect(() => { if (!open) setItems(tags); }, [JSON.stringify(tags), open]);

  // Close on outside click
  useEffect(() => {
    const h = e => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false); setNewVal(''); setItems(tags);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [tags]);

  const add = () => {
    const v = newVal.trim();
    if (!v) return;
    if (!items.includes(v)) setItems(p => [...p, v]);
    setNewVal('');
  };

  const remove = tag => setItems(p => p.filter(t => t !== tag));

  const save = () => { onSave(id, items); setOpen(false); setNewVal(''); };
  const cancel = () => { setItems(tags); setOpen(false); setNewVal(''); };

  return (
    <div ref={ref} className="relative">

      {/* ── Inline display — never changes height ── */}
      <div
        onClick={() => setOpen(true)}
        className="flex flex-wrap gap-1 cursor-pointer min-h-[22px] group"
        title="Click to edit tags"
      >
        {items.length === 0
          ? <span className="text-xs text-slate-300 dark:text-slate-600 group-hover:text-indigo-400 transition-colors">+ Add tag</span>
          : items.map(tag => (
              <span key={tag}
                className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded text-xs whitespace-nowrap">
                {tag}
              </span>
            ))}
      </div>

      {/* ── Floating edit panel — absolute, doesn't affect table ── */}
      {open && (
        <div className="absolute z-50 left-0 top-full mt-1 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-3">

          {/* Current tags */}
          <div className="flex flex-wrap gap-1.5 mb-3 min-h-[24px]">
            {items.length === 0
              ? <span className="text-xs text-slate-400 dark:text-slate-500 italic">No tags yet</span>
              : items.map(tag => (
                  <span key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded text-xs">
                    {tag}
                    <button onMouseDown={e => { e.preventDefault(); remove(tag); }}
                      className="text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-200 leading-none ml-0.5">
                      ×
                    </button>
                  </span>
                ))}
          </div>

          {/* Add input */}
          <div className="flex gap-1.5 mb-3">
            <input
              autoFocus
              value={newVal}
              onChange={e => setNewVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } if (e.key === 'Escape') cancel(); }}
              placeholder="Add tag…"
              className="flex-1 px-2 py-1 text-xs border border-slate-200 dark:border-slate-600 rounded-lg outline-none focus:ring-1 focus:ring-indigo-400 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
            {newVal.trim() && (
              <button onMouseDown={e => { e.preventDefault(); add(); }}
                className="px-2 py-1 text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-800 font-medium">
                Add
              </button>
            )}
          </div>

          {/* Save / Cancel */}
          <div className="flex gap-1.5 border-t border-slate-100 dark:border-slate-700 pt-2.5">
            <button onClick={cancel}
              className="flex-1 px-2 py-1.5 text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
              Cancel
            </button>
            <button onClick={save}
              className="flex-1 px-2 py-1.5 text-xs text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 font-medium">
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
