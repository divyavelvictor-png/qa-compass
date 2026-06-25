import { useState, useRef, useMemo } from 'react';

// ── Toast ─────────────────────────────────────────────────
export function ToastStack({ toasts, onRemove }) {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none" role="region" aria-live="polite" aria-label="Notifications">
      {toasts.map(t => (
        <div key={t.id}
          role="alert"
          className={`flex items-start gap-3 px-4 py-3 rounded-lg shadow-xl text-white text-sm font-medium w-80 pointer-events-auto ${
            t.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}>
          <span className="flex-1 leading-snug">{t.message}</span>
          <button onClick={() => onRemove(t.id)} aria-label="Dismiss notification"
            className="text-white/60 hover:text-white text-lg leading-none shrink-0 mt-0.5 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1 rounded">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

// ── ChipInput ─────────────────────────────────────────────
export function ChipInput({ chips, onChange, placeholder = 'Add tag…' }) {
  const [val, setVal] = useState('');
  const ref = useRef(null);

  const add = v => {
    const t = v.trim().replace(/,+$/, '');
    if (t && !chips.includes(t)) onChange([...chips, t]);
    setVal('');
  };

  return (
    <div
      className="flex flex-wrap gap-1 p-2 border border-slate-200 dark:border-slate-600 rounded-lg min-h-10 bg-white dark:bg-slate-800 cursor-text"
      onClick={() => ref.current?.focus()}>
      {chips.map(c => (
        <span key={c}
          className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs rounded-full font-medium">
          {c}
          <button type="button" aria-label={`Remove tag ${c}`}
            onClick={e => { e.stopPropagation(); onChange(chips.filter(x => x !== c)); }}
            className="text-indigo-400 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-200 text-sm leading-none focus-visible:ring-1 focus-visible:ring-indigo-500 rounded-full">
            ×
          </button>
        </span>
      ))}
      <input ref={ref} value={val}
        placeholder={chips.length ? '' : placeholder}
        className="flex-1 min-w-20 outline-none text-sm bg-transparent border-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
        onChange={e => { const v = e.target.value; if (v.endsWith(',')) add(v); else setVal(v); }}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(val); }
          else if (e.key === 'Backspace' && !val && chips.length) onChange(chips.slice(0, -1));
        }}
      />
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────
export function Pagination({ total, page, perPage, onChange }) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (!total) return null;

  const nums = useMemo(() => {
    if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
    const a = [1];
    if (page > 3) a.push('…');
    for (let i = Math.max(2, page - 1); i <= Math.min(pages - 1, page + 1); i++) a.push(i);
    if (page < pages - 2) a.push('…');
    a.push(pages);
    return a;
  }, [page, pages]);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-700/50 bg-white dark:bg-slate-900 text-sm">
      <span className="text-slate-500 dark:text-slate-400 text-xs">
        {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
      </span>
      <nav aria-label="Pagination" className="flex items-center gap-0.5">
        <button onClick={() => onChange(page - 1)} disabled={page === 1} aria-label="Previous page"
          className="px-2 py-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 rounded text-xs focus-visible:ring-2 focus-visible:ring-indigo-500">
          ‹ Prev
        </button>
        {nums.map((n, i) =>
          n === '…'
            ? <span key={`e${i}`} className="px-1 text-slate-400 dark:text-slate-500 text-xs">…</span>
            : <button key={n} onClick={() => onChange(n)} aria-label={`Page ${n}`} aria-current={n === page ? 'page' : undefined}
                className={`w-7 h-7 rounded text-xs focus-visible:ring-2 focus-visible:ring-indigo-500 ${n === page ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                {n}
              </button>
        )}
        <button onClick={() => onChange(page + 1)} disabled={page === pages} aria-label="Next page"
          className="px-2 py-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 rounded text-xs focus-visible:ring-2 focus-visible:ring-indigo-500">
          Next ›
        </button>
      </nav>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────
export function Modal({ title, onClose, children, footer }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col my-auto border border-slate-100 dark:border-slate-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
          <h2 id="modal-title" className="text-base font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
          <button onClick={onClose} aria-label="Close dialog"
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-xl focus-visible:ring-2 focus-visible:ring-indigo-500">
            ×
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5 space-y-4 max-h-[70vh]">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-b-xl shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Form helpers ──────────────────────────────────────────
export const Fld = ({ label, req, children }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
      {label}{req && <span className="text-red-500 ml-1" aria-label="required">*</span>}
    </label>
    {children}
  </div>
);

export const Inp = ({ className = '', ...p }) => (
  <input {...p} className={`w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-0 disabled:bg-slate-50 dark:disabled:bg-slate-700/50 disabled:text-slate-400 dark:disabled:text-slate-500 ${className}`} />
);

export const Txa = ({ className = '', ...p }) => (
  <textarea {...p} rows={p.rows || 3} className={`w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 resize-none ${className}`} />
);

export const Sel = ({ opts, empty = 'Select…', className = '', ...p }) => (
  <select {...p} className={`w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${className}`}>
    <option value="">{empty}</option>
    {opts.map(o => <option key={o} value={o}>{o}</option>)}
  </select>
);

export const Btn = ({ variant = 'primary', className = '', ...p }) => {
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400 focus-visible:ring-indigo-500',
    ghost:   'text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 focus-visible:ring-slate-400',
    sm:      'text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 !text-xs !px-3 !py-1.5 focus-visible:ring-slate-400',
  };
  return (
    <button {...p} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 ${variants[variant] || variants.primary} ${className}`} />
  );
};

export const SH = ({ col, sortCol, sortDir }) => (
  <span className="ml-1 text-[10px]" aria-hidden="true">
    {sortCol === col
      ? (sortDir === 'asc' ? '▲' : '▼')
      : <span className="text-slate-300 dark:text-slate-600">⇅</span>}
  </span>
);
