import { useState, useMemo, useRef } from 'react';
import { PRIORITIES, TC_TYPES, PER_PAGE, PRIORITY_BADGE } from '../lib/constants';
import { Pagination } from './ui';

const PICKER_PER_PAGE = 50;

function IndeterminateCheckbox({ checked, indeterminate, onChange }) {
  const ref = useRef(null);
  const { useEffect } = require !== undefined
    ? { useEffect: (fn, deps) => { /* noop fallback */ } }
    : { useEffect: () => {} };

  // Wire indeterminate imperatively (React doesn't support it as a prop)
  if (ref.current) ref.current.indeterminate = !checked && !!indeterminate;

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="w-4 h-4 rounded border-slate-300 accent-indigo-600 cursor-pointer"
    />
  );
}

export default function TCPickerModal({ testCases, alreadyLinked, onAdd, onClose }) {
  const [search, setSearch]   = useState('');
  const [fC, setFC] = useState('');
  const [fT, setFT] = useState('');
  const [fP, setFP] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [page, setPage] = useState(1);

  // Only show TCs not already linked to this plan
  const available = useMemo(
    () => testCases.filter(tc => !alreadyLinked.includes(tc.id)),
    [testCases, alreadyLinked]
  );

  const filtered = useMemo(() => {
    let d = [...available];
    if (search) {
      const q = search.toLowerCase();
      d = d.filter(t =>
        (t.id || '').toLowerCase().includes(q) ||
        (t.summary || '').toLowerCase().includes(q)
      );
    }
    if (fC) d = d.filter(t => t.component === fC);
    if (fT) d = d.filter(t => t.type === fT);
    if (fP) d = d.filter(t => t.priority === fP);
    return d;
  }, [available, search, fC, fT, fP]);

  const paged = useMemo(
    () => filtered.slice((page - 1) * PICKER_PER_PAGE, page * PICKER_PER_PAGE),
    [filtered, page]
  );

  const comps = useMemo(
    () => [...new Set(available.map(t => t.component).filter(Boolean))].sort(),
    [available]
  );

  // Reset page when filters change
  const applyFilter = (setter, val) => { setter(val); setPage(1); };

  // Header checkbox state
  const allFilteredSelected = filtered.length > 0 && filtered.every(t => selectedIds.has(t.id));
  const someSelected        = selectedIds.size > 0 && !allFilteredSelected;

  const toggleOne = id =>
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // Selects / deselects all filtered results (not just current page)
  const toggleAll = () =>
    setSelectedIds(allFilteredSelected
      ? new Set()
      : new Set(filtered.map(t => t.id))
    );

  const handleAdd = () => {
    onAdd([...selectedIds]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-5xl flex flex-col"
        style={{ maxHeight: '90vh' }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 dark:border-slate-700 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Select Test Cases</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {filtered.length} available
              {selectedIds.size > 0 && ` · ${selectedIds.size} selected`}
            </p>
          </div>
          <button onClick={onClose}
            className="text-slate-400 hover:text-slate-700 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-xl">
            ×
          </button>
        </div>

        {/* ── Filters ── */}
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-700 flex flex-wrap gap-2 shrink-0 bg-slate-50">
          <input
            value={search}
            onChange={e => applyFilter(setSearch, e.target.value)}
            placeholder="Search by Test ID or Summary…"
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm w-72 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
          />
          <select value={fC} onChange={e => applyFilter(setFC, e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
            <option value="">All Components</option>
            {comps.map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={fT} onChange={e => applyFilter(setFT, e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
            <option value="">All Types</option>
            {TC_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          <select value={fP} onChange={e => applyFilter(setFP, e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
            <option value="">All Priorities</option>
            {PRIORITIES.map(p => <option key={p}>{p}</option>)}
          </select>

          {/* Select-all shortcut when filtered */}
          {selectedIds.size > 0 && selectedIds.size < filtered.length && (
            <button
              onClick={() => setSelectedIds(new Set(filtered.map(t => t.id)))}
              className="text-xs text-indigo-600 hover:text-indigo-800 underline underline-offset-2 self-center ml-1">
              Select all {filtered.length} results
            </button>
          )}
          {selectedIds.size > 0 && (
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2 self-center">
              Clear selection
            </button>
          )}
        </div>

        {/* ── Table ── */}
        <div className="flex-1 overflow-auto">
          <table
            style={{ tableLayout: 'fixed', minWidth: '800px', width: '100%' }}
            className="text-sm">
            <colgroup>
              <col style={{ width: '44px' }} />
              <col style={{ width: '100px' }} />
              <col style={{ width: '260px' }} />
              <col style={{ width: '90px' }} />
              <col style={{ width: '120px' }} />
              <col style={{ width: 'auto' }} />
            </colgroup>
            <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
              <tr className="border-b border-slate-200">
                <th className="px-3 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    ref={el => { if (el) el.indeterminate = someSelected; }}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-slate-300 accent-indigo-600 cursor-pointer"
                  />
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Test ID</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Test Summary</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Priority</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Type</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Component</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <div className="text-3xl mb-2">🔍</div>
                    <p className="text-slate-400 dark:text-slate-500 text-sm">
                      {available.length === 0
                        ? 'All test cases are already linked to this plan'
                        : 'No test cases match the current filters'}
                    </p>
                  </td>
                </tr>
              ) : paged.map(tc => (
                <tr
                  key={tc.id}
                  onClick={() => toggleOne(tc.id)}
                  className={`cursor-pointer transition-colors ${
                    selectedIds.has(tc.id) ? 'bg-indigo-50' : 'hover:bg-slate-50'
                  }`}>
                  <td className="px-3 py-2.5 text-center"
                    onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(tc.id)}
                      onChange={() => toggleOne(tc.id)}
                      className="w-4 h-4 rounded border-slate-300 accent-indigo-600 cursor-pointer"
                    />
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-indigo-600 font-semibold">{tc.id}</td>
                  <td className="px-3 py-2.5 text-slate-800 dark:text-slate-100 text-xs truncate" title={tc.summary}>{tc.summary}</td>
                  <td className="px-3 py-2.5">
                    {tc.priority && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_BADGE[tc.priority] || 'bg-slate-100 text-slate-600'}`}>
                        {tc.priority}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {tc.type && (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">{tc.type}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400 text-xs truncate">{tc.component}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {filtered.length > PICKER_PER_PAGE && (
          <div className="shrink-0 border-t border-slate-100 dark:border-slate-700">
            <Pagination
              total={filtered.length}
              page={page}
              perPage={PICKER_PER_PAGE}
              onChange={setPage}
            />
          </div>
        )}

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-b-xl shrink-0">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {selectedIds.size > 0
              ? `${selectedIds.size} test case${selectedIds.size !== 1 ? 's' : ''} selected`
              : 'Click rows or checkboxes to select test cases'}
          </p>
          <div className="flex gap-3">
            <button onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-white">
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={selectedIds.size === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed">
              Add {selectedIds.size > 0 ? `${selectedIds.size} ` : ''}Test Case{selectedIds.size !== 1 ? 's' : ''}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
