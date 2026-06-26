import { useState, useRef, useEffect } from 'react';

export const NONE_VAL = '__none__';

/**
 * MultiSelect — searchable, multi-select combobox.
 * options:    string[]
 * selected:   string[]   (may include NONE_VAL)
 * onChange:   (string[]) => void
 * noneLabel:  "No Components" etc.  — adds a special "no value" option
 */
export function MultiSelect({ options = [], selected = [], onChange, placeholder = 'Select…', noneLabel, className = '' }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setSearch(''); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));

  const toggle = val => onChange(
    selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]
  );

  const clear = e => { e.stopPropagation(); onChange([]); };

  const label = () => {
    if (selected.length === 0) return placeholder;
    const noneOnly = selected.length === 1 && selected[0] === NONE_VAL;
    if (noneOnly) return noneLabel || 'No value';
    const vals = selected.filter(v => v !== NONE_VAL);
    const extra = selected.includes(NONE_VAL) ? 1 : 0;
    const total = vals.length + extra;
    if (total === 1) return vals[0] || noneLabel;
    return `${total} selected`;
  };

  const active = selected.length > 0;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button type="button" onClick={() => { setOpen(o => !o); setSearch(''); }}
        className={`flex items-center justify-between gap-1 w-full px-3 py-2 text-xs rounded-lg border transition-colors text-left focus-visible:ring-2 focus-visible:ring-indigo-400
          ${active
            ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
            : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200'}`}>
        <span className="truncate">{label()}</span>
        <div className="flex items-center gap-0.5 shrink-0">
          {active && (
            <span onMouseDown={e => { e.stopPropagation(); onChange([]); }}
              className="text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-200 text-base leading-none px-0.5 cursor-pointer">
              ×
            </span>
          )}
          <svg className={`w-3 h-3 transition-transform text-slate-400 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="absolute z-40 top-full left-0 mt-1 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-slate-100 dark:border-slate-700">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search…" autoFocus
              className="w-full px-2 py-1 text-xs border border-slate-200 dark:border-slate-600 rounded-lg outline-none focus:ring-1 focus:ring-indigo-400 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500" />
          </div>

          <div className="max-h-52 overflow-y-auto py-1">
            {noneLabel && !search && (
              <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                <input type="checkbox" checked={selected.includes(NONE_VAL)} onChange={() => toggle(NONE_VAL)}
                  className="rounded border-slate-300 accent-indigo-600 cursor-pointer" />
                <span className="text-xs text-slate-500 dark:text-slate-400 italic">{noneLabel}</span>
              </label>
            )}
            {filtered.length === 0 && (
              <p className="px-3 py-3 text-xs text-slate-400 dark:text-slate-500 text-center">No options found</p>
            )}
            {filtered.map(opt => (
              <label key={opt} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)}
                  className="rounded border-slate-300 accent-indigo-600 cursor-pointer" />
                <span className="text-xs text-slate-800 dark:text-slate-100 truncate">{opt}</span>
              </label>
            ))}
          </div>

          {selected.length > 0 && (
            <div className="border-t border-slate-100 dark:border-slate-700 px-3 py-1.5 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <span className="text-xs text-slate-500 dark:text-slate-400">{selected.length} selected</span>
              <button onMouseDown={clear} className="text-xs text-indigo-500 hover:text-indigo-700 dark:text-indigo-400">Clear all</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper: filter array using multi-select state (handles NONE_VAL)
export function matchMulti(val, selected) {
  if (!selected || selected.length === 0) return true;
  if (selected.includes(NONE_VAL) && !val) return true;
  const others = selected.filter(v => v !== NONE_VAL);
  return others.length > 0 && others.includes(val);
}

// Tags version: val is an array
export function matchMultiTags(tags, selected) {
  if (!selected || selected.length === 0) return true;
  const arr = tags || [];
  if (selected.includes(NONE_VAL) && arr.length === 0) return true;
  const others = selected.filter(v => v !== NONE_VAL);
  return others.length > 0 && others.some(g => arr.includes(g));
}
