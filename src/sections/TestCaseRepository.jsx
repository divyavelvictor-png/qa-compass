import { useState, useEffect, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { PRIORITIES, TC_TYPES, PER_PAGE, PRIORITY_BADGE } from '../lib/constants';
import { dbBulkCreateTCs, dbUpdateTCTags, dbDeleteTCs } from '../lib/db';
import { Btn, SH, Pagination } from '../components/ui';
import CreateTCModal from '../components/CreateTCModal';
import EditTCModal   from '../components/EditTCModal';
import TagCell from '../components/TagCell';

// Handles the native indeterminate state that React cannot set as a prop
function Checkbox({ checked, indeterminate, onChange, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !checked && !!indeterminate;
  }, [checked, indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className={`w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600 ${className}`}
    />
  );
}

const COLS = [
  { l: 'Test ID',          k: 'id',             w: '95px',  s: 'id' },
  { l: 'Test Summary',     k: 'summary',         w: '200px' },
  { l: 'Priority',         k: 'priority',        w: '88px',  s: 'priority' },
  { l: 'Pre-requisite',    k: 'prerequisite',    w: '135px' },
  { l: 'Actions',          k: 'actions',         w: '135px' },
  { l: 'Expected Results', k: 'expectedResults', w: '135px' },
  { l: 'Test Case Type',   k: 'type',            w: '110px', s: 'type' },
  { l: 'JIRA ID',          k: 'jiraId',          w: '88px' },
  { l: 'Components',       k: 'component',       w: '110px', s: 'component' },
  { l: 'Tags',             k: 'tags',            w: '165px' },
];

export default function TestCaseRepository({ testCases, loadData, addToast }) {
  const [search, setSearch]   = useState('');
  const [ds, setDs]           = useState('');
  const [fC, setFC] = useState(''); const [fT, setFT] = useState('');
  const [fG, setFG] = useState(''); const [fP, setFP] = useState('');
  const [sortCol, setSortCol] = useState('id');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage]       = useState(1);
  const [showCreate, setShowCreate]   = useState(false);
  const [editingTc,  setEditingTc]    = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting]       = useState(false);
  const fileRef = useRef(null);
  const dbRef   = useRef(null);

  useEffect(() => {
    clearTimeout(dbRef.current);
    dbRef.current = setTimeout(() => setDs(search), 300);
    return () => clearTimeout(dbRef.current);
  }, [search]);

  useEffect(() => { setPage(1); setSelectedIds(new Set()); }, [ds, fC, fT, fG, fP]);

  const comps   = useMemo(() => [...new Set(testCases.map(t => t.component).filter(Boolean))].sort(), [testCases]);
  const allTags = useMemo(() => [...new Set(testCases.flatMap(t => t.tags || []))].sort(), [testCases]);

  const filtered = useMemo(() => {
    let d = [...testCases];
    if (ds) {
      const q = ds.toLowerCase();
      d = d.filter(t =>
        (t.id || '').toLowerCase().includes(q) ||
        (t.summary || '').toLowerCase().includes(q) ||
        (t.jiraId || '').toLowerCase().includes(q)
      );
    }
    if (fC) d = d.filter(t => t.component === fC);
    if (fT) d = d.filter(t => t.type === fT);
    if (fG) d = d.filter(t => (t.tags || []).includes(fG));
    if (fP) d = d.filter(t => t.priority === fP);
    d.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      return (a[sortCol] || '') < (b[sortCol] || '') ? -dir
           : (a[sortCol] || '') > (b[sortCol] || '') ?  dir : 0;
    });
    return d;
  }, [testCases, ds, fC, fT, fG, fP, sortCol, sortDir]);

  const paged = useMemo(
    () => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    [filtered, page]
  );

  const sort = col => {
    setSortDir(d => sortCol === col ? (d === 'asc' ? 'desc' : 'asc') : 'asc');
    setSortCol(col);
  };

  // ── Selection ──────────────────────────────────────────
  const allFilteredSelected = filtered.length > 0 && filtered.every(t => selectedIds.has(t.id));
  const someSelected        = selectedIds.size > 0 && !allFilteredSelected;

  const toggleOne = id =>
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelectedIds(allFilteredSelected ? new Set() : new Set(filtered.map(t => t.id)));

  // ── Delete ─────────────────────────────────────────────
  const confirmDelete = async () => {
    setDeleting(true);
    try {
      const ids = [...selectedIds];
      await dbDeleteTCs(ids);
      addToast(`${ids.length} test case${ids.length !== 1 ? 's' : ''} deleted`, 'success');
      setSelectedIds(new Set());
      setShowConfirm(false);
      loadData();
    } catch {
      addToast('Failed to delete. Please try again.', 'error');
    }
    setDeleting(false);
  };

  // ── Template download ───────────────────────────────────
  const dlTemplate = () => {
    const headers = [
      'Test Summary', 'Priority', 'Pre-Requisite', 'Actions',
      'Expected Results', 'Test Case Type', 'JIRA ID (Optional)', 'Component', 'Tags (Optional)',
    ];
    const hints = [
      'Enter the test case description',
      'High | Medium | Low',
      'Conditions that must be met before execution',
      'Step-by-step actions to execute the test',
      'Expected outcome after executing the actions',
      'UI | Functional | Accessibility',
      'Optional — e.g. PROJ-123',
      'e.g. Login, Checkout',
      'Optional — comma-separated e.g. smoke, regression',
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, hints]);
    ws['!cols'] = [
      { wch: 42 }, { wch: 22 }, { wch: 32 }, { wch: 32 }, { wch: 32 },
      { wch: 24 }, { wch: 14 }, { wch: 20 }, { wch: 28 },
    ];
    ws['!rows'] = [{ hpt: 22 }, { hpt: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Test Case Template');
    XLSX.writeFile(wb, 'test_case_template.xlsx');
  };

  // ── Upload ──────────────────────────────────────────────
  const handleUpload = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const proc = async rows => {
      // 1. File produced no rows (empty sheet / empty CSV)
      if (!rows?.length) {
        addToast('The file is empty. Fill in the template and try again.', 'error');
        return;
      }

      // 2. "Test Summary" column is missing entirely
      const sample = rows[0];
      const hasSummaryCol = Object.keys(sample).some(
        k => k.toLowerCase().trim() === 'test summary'
      );
      if (!hasSummaryCol) {
        addToast(
          'Column "Test Summary" not found. Use the ⬇ Template button to download the correct format.',
          'error'
        );
        return;
      }

      // 3. Rows exist but every Test Summary cell is blank
      const valid   = rows.filter(r => (r['Test Summary'] || r['test summary'])?.toString().trim());
      const skipped = rows.length - valid.length;

      if (!valid.length) {
        addToast(
          `No data to import — all ${rows.length} row${rows.length !== 1 ? 's' : ''} are missing a Test Summary value.`,
          'error'
        );
        return;
      }

      // 4. Detect invalid Priority / Type values (non-blocking — bad values are cleared on import)
      const VALID_PRIORITIES = ['High', 'Medium', 'Low'];
      const VALID_TYPES      = ['UI', 'Functional', 'Accessibility'];

      const badPriority = valid.filter(r => {
        const p = (r['Priority'] || r['priority'] || '').toString().trim();
        return p && !VALID_PRIORITIES.includes(p);
      });
      const badType = valid.filter(r => {
        const t = (r['Test Case Type'] || r['test case type'] || '').toString().trim();
        return t && !VALID_TYPES.includes(t);
      });

      // 5. Attempt DB insert
      try {
        const n = await dbBulkCreateTCs(rows);

        // Build a detailed success message
        const parts = [`${n} test case${n !== 1 ? 's' : ''} added successfully`];
        if (skipped > 0)
          parts.push(`${skipped} row${skipped !== 1 ? 's' : ''} skipped — missing Test Summary`);
        if (badPriority.length)
          parts.push(`${badPriority.length} invalid Priority value${badPriority.length !== 1 ? 's' : ''} cleared (use High / Medium / Low)`);
        if (badType.length)
          parts.push(`${badType.length} invalid Type value${badType.length !== 1 ? 's' : ''} cleared (use UI / Functional / Accessibility)`);

        addToast(parts.join('  ·  '), 'success');
        loadData();
      } catch (err) {
        const msg = (err?.message || '').toLowerCase();

        if (msg.includes('duplicate') || msg.includes('unique') || msg.includes('already exists')) {
          addToast('Upload failed: one or more test case IDs already exist in the database.', 'error');
        } else if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('network')) {
          addToast('Upload failed: network error. Check your internet connection and try again.', 'error');
        } else if (msg.includes('jwt') || msg.includes('unauthorized') || msg.includes('403')) {
          addToast('Upload failed: session expired. Refresh the page and try again.', 'error');
        } else if (err?.message) {
          addToast(`Upload failed: ${err.message}`, 'error');
        } else {
          addToast('Upload failed for an unknown reason. Please try again.', 'error');
        }
      }
    };

    // ── CSV ──
    if (file.name.toLowerCase().endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: r => proc(r.data),
        error: err =>
          addToast(
            `Could not read CSV: ${err?.message || 'invalid format'}. Make sure the file is saved as a proper CSV.`,
            'error'
          ),
      });

    // ── Excel ──
    } else {
      const reader = new FileReader();

      reader.onload = ev => {
        try {
          const wb = XLSX.read(ev.target.result, { type: 'binary' });

          if (!wb.SheetNames?.length) {
            addToast(
              'The Excel file has no sheets. Use the ⬇ Template button to get the correct format.',
              'error'
            );
            return;
          }

          const ws   = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(ws);
          proc(rows);
        } catch (err) {
          addToast(
            `Could not read the Excel file: ${err?.message || 'unknown error'}. ` +
            'Make sure the file is not open in Excel, then try again.',
            'error'
          );
        }
      };

      reader.onerror = () =>
        addToast(
          'The file could not be opened. Make sure it is not open in Excel or another program, then try again.',
          'error'
        );

      reader.readAsBinaryString(file);
    }
  };

  // ── Export to Excel ─────────────────────────────────────
  const dlExcel = () => {
    const HEADERS = [
      'Test ID', 'Test Summary', 'Priority', 'Pre-requisite', 'Actions',
      'Expected Results', 'Actual Results', 'Test Case Type', 'JIRA ID', 'Component', 'Tags',
    ];
    const rows = filtered.map(t => [
      t.id || '', t.summary || '', t.priority || '', t.prerequisite || '',
      t.actions || '', t.expectedResults || '', t.actualResults || '',
      t.type || '', t.jiraId || '', t.component || '',
      (t.tags || []).join(', '),
    ]);
    const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...rows]);
    ws['!cols'] = [
      { wch: 12 }, { wch: 44 }, { wch: 10 }, { wch: 28 }, { wch: 28 },
      { wch: 28 }, { wch: 28 }, { wch: 16 }, { wch: 14 }, { wch: 18 }, { wch: 22 },
    ];
    ws['!rows'] = [{ hpt: 22 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Test Cases');
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `QA_Compass_Test_Cases_${date}.xlsx`);
  };

  const saveTags = async (id, tags) => {
    try { await dbUpdateTCTags(id, tags); loadData(); } catch {}
  };

  return (
    <div className="p-6">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Test Case Repository</h1>
          <p className="text-sm text-slate-500 mt-0.5">{testCases.length} test cases total</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Btn variant="sm" onClick={dlTemplate}>⬇ Template</Btn>
          <Btn variant="sm" onClick={() => fileRef.current?.click()}>⬆ Upload</Btn>
          <input ref={fileRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={handleUpload} />
          <Btn variant="sm" onClick={dlExcel}>⬇ Export to Excel</Btn>
          <Btn onClick={() => setShowCreate(true)}>+ Create Test Case</Btn>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-3">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search ID, Summary, JIRA…"
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        <select value={fC} onChange={e => setFC(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
          <option value="">All Components</option>
          {comps.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={fT} onChange={e => setFT(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
          <option value="">All Types</option>
          {TC_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <select value={fG} onChange={e => setFG(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
          <option value="">All Tags</option>
          {allTags.map(t => <option key={t}>{t}</option>)}
        </select>
        <select value={fP} onChange={e => setFP(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => <option key={p}>{p}</option>)}
        </select>
      </div>

      {/* Selection action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-indigo-50 border border-indigo-200 rounded-lg mb-3">
          <span className="text-sm text-indigo-700 font-medium">
            {selectedIds.size} test case{selectedIds.size !== 1 ? 's' : ''} selected
            {selectedIds.size < filtered.length && (
              <button
                onClick={() => setSelectedIds(new Set(filtered.map(t => t.id)))}
                className="ml-3 text-indigo-500 underline underline-offset-2 hover:text-indigo-700 text-xs font-normal">
                Select all {filtered.length} results
              </button>
            )}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1">
              Clear selection
            </button>
            <button
              onClick={() => setShowConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">
              🗑 Delete {selectedIds.size} selected
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table style={{ tableLayout: 'fixed', minWidth: '1305px', width: '100%' }} className="text-sm">
            <colgroup>
              <col style={{ width: '44px' }} />
              {COLS.map(c => <col key={c.k} style={{ width: c.w }} />)}
            </colgroup>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {/* Header checkbox */}
                <th className="px-3 py-3 text-center">
                  <Checkbox
                    checked={allFilteredSelected}
                    indeterminate={someSelected}
                    onChange={toggleAll}
                  />
                </th>
                {COLS.map(c => (
                  <th key={c.k}
                    onClick={c.s ? () => sort(c.s) : undefined}
                    className={`px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide ${c.s ? 'cursor-pointer hover:bg-slate-100 select-none' : ''}`}>
                    {c.l}{c.s && <SH col={c.s} sortCol={sortCol} sortDir={sortDir} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-16">
                    <div className="text-4xl mb-2">📋</div>
                    <p className="text-slate-400 text-sm">
                      {testCases.length === 0
                        ? 'No test cases yet — create one or upload from a template'
                        : 'No test cases match the current filters'}
                    </p>
                  </td>
                </tr>
              ) : paged.map(tc => (
                <tr key={tc.id}
                  className={`hover:bg-slate-50 ${selectedIds.has(tc.id) ? 'bg-indigo-50/60' : ''}`}>
                  {/* Row checkbox */}
                  <td className="px-3 py-2.5 text-center">
                    <Checkbox
                      checked={selectedIds.has(tc.id)}
                      onChange={() => toggleOne(tc.id)}
                    />
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-indigo-600 font-semibold">{tc.id}</td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => setEditingTc(tc)}
                      className="text-slate-800 text-xs truncate text-left w-full hover:text-indigo-600 hover:underline underline-offset-2"
                      title={tc.summary}>
                      {tc.summary}
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    {tc.priority && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_BADGE[tc.priority] || 'bg-slate-100 text-slate-600'}`}>
                        {tc.priority}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-slate-500 text-xs truncate" title={tc.prerequisite}>{tc.prerequisite}</td>
                  <td className="px-3 py-2.5 text-slate-500 text-xs truncate" title={tc.actions}>{tc.actions}</td>
                  <td className="px-3 py-2.5 text-slate-500 text-xs truncate" title={tc.expectedResults}>{tc.expectedResults}</td>
                  <td className="px-3 py-2.5">
                    {tc.type && <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">{tc.type}</span>}
                  </td>
                  <td className="px-3 py-2.5 text-slate-500 text-xs truncate">{tc.jiraId}</td>
                  <td className="px-3 py-2.5 text-slate-500 text-xs truncate">{tc.component}</td>
                  <td className="px-3 py-2.5">
                    <TagCell id={tc.id} tags={tc.tags || []} onSave={saveTags} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination total={filtered.length} page={page} perPage={PER_PAGE} onChange={setPage} />
      </div>

      {/* Create modal */}
      {showCreate && (
        <CreateTCModal
          onClose={() => setShowCreate(false)}
          onCreated={() => loadData()}
          addToast={addToast}
          previewId="Auto-generated"
        />
      )}

      {/* Edit modal */}
      {editingTc && (
        <EditTCModal
          tc={editingTc}
          onClose={() => setEditingTc(null)}
          onSaved={() => loadData()}
          addToast={addToast}
        />
      )}

      {/* Delete confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="text-base font-semibold text-slate-800 mb-2">
              Delete {selectedIds.size} test case{selectedIds.size !== 1 ? 's' : ''}?
            </h3>
            <p className="text-sm text-slate-500 mb-5">
              This will permanently remove the selected test cases and unlink them from any test plans.
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={deleting}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50">
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2">
                {deleting ? (
                  <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full spin inline-block" /> Deleting…</>
                ) : `Delete ${selectedIds.size}`}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
