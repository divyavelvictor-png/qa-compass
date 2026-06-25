import { useState, useRef, useMemo } from 'react';

// ── Toast ─────────────────────────────────────────────────
export function ToastStack({ toasts, onRemove }) {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-lg shadow-xl text-white text-sm font-medium w-80 pointer-events-auto ${
            t.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}>
          <span className="flex-1 leading-snug">{t.message}</span>
          <button onClick={() => onRemove(t.id)}
            className="text-white/60 hover:text-white text-lg leading-none shrink-0 mt-0.5">×</button>
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
      className="flex flex-wrap gap-1 p-2 border border-slate-200 rounded-lg min-h-10 bg-white cursor-text"
      onClick={() => ref.current?.focus()}
    >
      {chips.map(c => (
        <span key={c}
          className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full font-medium">
          {c}
          <button type="button"
            onClick={e => { e.stopPropagation(); onChange(chips.filter(x => x !== c)); }}
            className="text-indigo-400 hover:text-indigo-700 text-sm leading-none">×</button>
        </span>
      ))}
      <input
        ref={ref}
        value={val}
        placeholder={chips.length ? '' : placeholder}
        className="flex-1 min-w-20 outline-none text-sm bg-transparent border-none"
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
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-white text-sm">
      <span className="text-slate-500 text-xs">
        {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
      </span>
      <div className="flex items-center gap-0.5">
        <button onClick={() => onChange(page - 1)} disabled={page === 1}
          className="px-2 py-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30 rounded text-xs">
          ‹ Prev
        </button>
        {nums.map((n, i) =>
          n === '…'
            ? <span key={`e${i}`} className="px-1 text-slate-400 text-xs">…</span>
            : <button key={n} onClick={() => onChange(n)}
                className={`w-7 h-7 rounded text-xs ${n === page ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                {n}
              </button>
        )}
        <button onClick={() => onChange(page + 1)} disabled={page === pages}
          className="px-2 py-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30 rounded text-xs">
          Next ›
        </button>
      </div>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────
export function Modal({ title, onClose, children, footer }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col my-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h2 className="text-base font-semibold text-slate-800">{title}</h2>
          <button onClick={onClose}
            className="text-slate-400 hover:text-slate-700 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-xl">
            ×
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5 space-y-4 max-h-[70vh]">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-xl shrink-0">
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
    <label className="block text-sm font-medium text-slate-700 mb-1.5">
      {label}{req && <span className="text-red-500 ml-1">*</span>}
    </label>
    {children}
  </div>
);

export const Inp = ({ className = '', ...p }) => (
  <input {...p} className={`w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white disabled:bg-slate-50 disabled:text-slate-400 ${className}`} />
);

export const Txa = ({ className = '', ...p }) => (
  <textarea {...p} rows={p.rows || 3} className={`w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none ${className}`} />
);

export const Sel = ({ opts, empty = 'Select…', className = '', ...p }) => (
  <select {...p} className={`w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white ${className}`}>
    <option value="">{empty}</option>
    {opts.map(o => <option key={o} value={o}>{o}</option>)}
  </select>
);

export const Btn = ({ variant = 'primary', className = '', ...p }) => {
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
    ghost:   'text-slate-600 border border-slate-200 hover:bg-slate-50',
    sm:      'text-slate-600 border border-slate-200 hover:bg-slate-50 !text-xs !px-3 !py-1.5',
  };
  return (
    <button {...p} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${variants[variant] || variants.primary} ${className}`} />
  );
};

export const SH = ({ col, sortCol, sortDir }) => (
  <span className="ml-1 text-[10px]">
    {sortCol === col
      ? (sortDir === 'asc' ? '▲' : '▼')
      : <span className="text-slate-300">⇅</span>}
  </span>
);
