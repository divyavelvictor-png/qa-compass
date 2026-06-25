import { useState, useEffect } from 'react';

/**
 * BugList — inline multi-bug manager used in table cells and modals.
 * compact=true → minimal layout for table cells
 * compact=false → spaced layout for modals
 */
export function BugList({ bugs = [], onSave, compact = false }) {
  const [items, setItems] = useState(bugs);
  const [newVal, setNewVal] = useState('');

  useEffect(() => { setItems(Array.isArray(bugs) ? bugs : []); }, [JSON.stringify(bugs)]);

  const commit = (next) => { setItems(next); onSave(next); };
  const add    = () => { const v = newVal.trim(); if (!v) return; commit([...items, v]); setNewVal(''); };
  const remove = (i) => commit(items.filter((_, j) => j !== i));
  const update = (i, val) => { const next = [...items]; next[i] = val; setItems(next); };

  const rowCls   = compact ? 'flex items-center gap-1 group' : 'flex items-center gap-2 group';
  const inputCls = compact
    ? 'flex-1 text-xs bg-transparent outline-none border-b border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-indigo-400 dark:text-slate-200 dark:placeholder:text-slate-600 min-w-0 py-0.5'
    : 'flex-1 text-sm bg-transparent outline-none border-b border-slate-200 dark:border-slate-700 focus:border-indigo-400 text-slate-800 dark:text-slate-100 min-w-0 py-1';
  const addCls   = compact
    ? 'flex-1 text-xs bg-transparent outline-none border-b border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-indigo-400 text-slate-400 dark:text-slate-500 dark:placeholder:text-slate-600 min-w-0 py-0.5'
    : 'flex-1 text-sm bg-transparent outline-none border-b border-slate-200 dark:border-slate-700 focus:border-indigo-400 text-slate-500 dark:text-slate-400 min-w-0 py-1';

  return (
    <div className={compact ? 'space-y-1' : 'space-y-3'}>
      {items.map((bug, i) => (
        <div key={i} className={rowCls}>
          <input value={bug}
            onChange={e => update(i, e.target.value)}
            onBlur={() => commit(items)}
            className={inputCls}
          />
          <button onClick={() => remove(i)} title="Remove bug"
            className={`opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 dark:text-red-500 shrink-0 leading-none transition-opacity ${compact ? 'text-sm' : 'text-base'}`}>
            ×
          </button>
        </div>
      ))}

      {/* Add new bug row */}
      <div className={rowCls}>
        <input value={newVal}
          onChange={e => setNewVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={items.length === 0 ? 'Add bug ID…' : '+ Add another…'}
          className={addCls}
        />
        {newVal.trim() && (
          <button onClick={add} title="Add bug"
            className={`text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 shrink-0 ${compact ? 'text-xs' : 'text-sm'}`}>
            ✓
          </button>
        )}
      </div>

      {!compact && items.length > 0 && (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          {items.length} bug{items.length !== 1 ? 's' : ''} linked
        </p>
      )}
    </div>
  );
}
