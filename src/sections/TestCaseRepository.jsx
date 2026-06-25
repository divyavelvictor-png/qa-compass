import { useState, useEffect, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { PRIORITIES, TC_TYPES, PER_PAGE, PRIORITY_BADGE } from '../lib/constants';
import { dbBulkCreateTCs, dbUpdateTCTags, dbDeleteTCs, dbUpdateTCBugs } from '../lib/db';
import { useTableState } from '../lib/useTableState';
import { ResizableTh } from '../components/ResizableTh';
import { BugList } from '../components/BugList';
import { Btn, SH, Pagination } from '../components/ui';
import CreateTCModal from '../components/CreateTCModal';
import EditTCModal   from '../components/EditTCModal';
import TagCell from '../components/TagCell';

// Indeterminate checkbox
function Checkbox({ checked, indeterminate, onChange, className = '' }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = !checked && !!indeterminate; }, [checked, indeterminate]);
  return (
    <input ref={ref} type="checkbox" checked={checked} onChange={onChange}
      className={`w-4 h-4 rounded border-slate-300 accent-indigo-600 cursor-pointer ${className}`} />
  );
}

// Inline bug details cell
function BugCell({ tc, onSave }) {
  const [val, setVal] = useState(tc.bugDetails || '');
  useEffect(() => setVal(tc.bugDetails || ''), [tc.bugDetails]);
  return (
    <input value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={() => { if (val !== (tc.bugDetails || '')) onSave(tc.id, val); }}
      placeholder="Add bug info…"
      className="w-full text-xs bg-transparent outline-none border-b border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-indigo-400 dark:text-slate-200 dark:placeholder:text-slate-600 py-0.5 transition-colors"
    />
  );
}

const INIT_COLS = [
  { l: 'Test ID',           k: 'id',             w: '95px',  s: 'id' },
  { l: 'Test Summary',      k: 'summary',         w: '200px' },
  { l: 'Priority',          k: 'priority',        w: '88px',  s: 'priority' },
  { l: 'Pre-requisite',     k: 'prerequisite',    w: '130px' },
  { l: 'Actions',           k: 'actions',         w: '130px' },
  { l: 'Expected Results',  k: 'expectedResults', w: '130px' },
  { l: 'Test Case Type',    k: 'type',            w: '110px', s: 'type' },
  { l: 'JIRA ID',           k: 'jiraId',          w: '90px' },
  { l: 'Component',         k: 'component',       w: '110px', s: 'component' },
  { l: 'Tags',              k: 'tags',            w: '155px' },
  { l: 'Linked Plans',      k: 'linkedPlans',     w: '145px' },
  { l: 'Bug Details',       k: 'bugDetails',      w: '165px' },
];

export default function TestCaseRepository({ testCases, testPlans = [], loadData, addToast }) {
  const [search, setSearch]   = useState('');
  const [ds, setDs]           = useState('');
  const [fC, setFC] = useState(''); const [fT, setFT] = useState('');
  const [fG, setFG] = useState(''); const [fP, setFP] = useState('');
  const [fPlan, setFPlan]     = useState('');
  const [sortCol, setSortCol] = useState('id');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage]       = useState(1);
  const [showCreate, setShowCreate]   = useState(false);
  const [editingTc,  setEditingTc]    = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting]       = useState(false);
  const [uploadState, setUploadState] = useState(null); // null | { phase, count? }
  const fileRef = useRef(null);
  const dbRef   = useRef(null);

  // Column resize + reorder state
  const { cols, startResize, drag, dragOver } = useTableState('tcrepo', INIT_COLS);

  useEffect(() => {
    clearTimeout(dbRef.current);
    dbRef.current = setTimeout(() => setDs(search), 300);
    return () => clearTimeout(dbRef.current);
  }, [search]);

  useEffect(() => { setPage(1); setSelectedIds(new Set()); }, [ds, fC, fT, fG, fP, fPlan]);

  // Map: TC ID → array of plan IDs that include it
  const tcPlanMap = useMemo(() => {
    const map = {};
    testPlans.forEach(plan => {
      (plan.testCaseIds || []).forEach(id => {
        if (!map[id]) map[id] = [];
        map[id].push(plan.id);
      });
    });
    return map;
  }, [testPlans]);

  const comps   = useMemo(() => [...new Set(testCases.map(t => t.component).filter(Boolean))].sort(), [testCases]);
  const allTags = useMemo(() => [...new Set(testCases.flatMap(t => t.tags || []))].sort(), [testCases]);
  const planIds = useMemo(() => [...new Set(testPlans.map(p => p.id))].sort(), [testPlans]);

  const filtered = useMemo(() => {
    let d = [...testCases];
    if (ds) {
      const q = ds.toLowerCase();
      d = d.filter(t =>
        (t.id || '').toLowerCase().includes(q) ||
        (t.summary || '').toLowerCase().includes(q) ||
        (t.jiraId || '').toLowerCase().includes(q) ||
        (tcPlanMap[t.id] || []).some(pId => pId.toLowerCase().includes(q))
      );
    }
    if (fC)    d = d.filter(t => t.component === fC);
    if (fT)    d = d.filter(t => t.type === fT);
    if (fG)    d = d.filter(t => (t.tags || []).includes(fG));
    if (fP)    d = d.filter(t => t.priority === fP);
    if (fPlan) d = d.filter(t => (tcPlanMap[t.id] || []).includes(fPlan));
    d.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      return (a[sortCol] || '') < (b[sortCol] || '') ? -dir : (a[sortCol] || '') > (b[sortCol] || '') ? dir : 0;
    });
    return d;
  }, [testCases, ds, fC, fT, fG, fP, fPlan, sortCol, sortDir, tcPlanMap]);

  const paged = useMemo(() => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE), [filtered, page]);
  const sort  = col => { setSortDir(d => sortCol === col ? (d === 'asc' ? 'desc' : 'asc') : 'asc'); setSortCol(col); };

  // Selection
  const allFilteredSelected = filtered.length > 0 && filtered.every(t => selectedIds.has(t.id));
  const someSelected        = selectedIds.size > 0 && !allFilteredSelected;
  const toggleOne = id => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelectedIds(allFilteredSelected ? new Set() : new Set(filtered.map(t => t.id)));

  // Delete
  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await dbDeleteTCs([...selectedIds]);
      addToast(`${selectedIds.size} test case${selectedIds.size !== 1 ? 's' : ''} deleted`, 'success');
      setSelectedIds(new Set()); setShowConfirm(false); loadData();
    } catch { addToast('Failed to delete. Please try again.', 'error'); }
    setDeleting(false);
  };

  // Bug details save
  const saveBug = async (id, bugs) => {
    try { await dbUpdateTCBugs(id, bugs); loadData(); }
    catch { addToast('Failed to save bug details.', 'error'); }
  };

  // Template download
  const dlTemplate = () => {
    const headers = [
      'Test Summary', 'Priority', 'Pre-Requisite', 'Actions',
      'Expected Results', 'Test Case Type', 'JIRA ID (Optional)', 'Component',
      'Tags (Optional)', 'Bug Details (Optional)',
    ];
    const hints = [
      'Enter the test case description', 'High | Medium | Low',
      'Conditions that must be met before execution', 'Step-by-step actions to execute the test',
      'Expected outcome after executing the actions', 'UI | Functional | Accessibility',
      'Optional — e.g. PROJ-123', 'e.g. Login, Checkout',
      'Optional — comma-separated e.g. smoke, regression',
      'Optional — e.g. BUG-123 Login fails on mobile',
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, hints]);
    ws['!cols'] = [{ wch:42 },{ wch:22 },{ wch:32 },{ wch:32 },{ wch:32 },{ wch:24 },{ wch:14 },{ wch:20 },{ wch:28 },{ wch:32 }];
    ws['!rows'] = [{ hpt:22 },{ hpt:18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Test Case Template');
    XLSX.writeFile(wb, 'test_case_template.xlsx');
  };

  // Upload
  const handleUpload = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploadState({ phase: 'reading' });

    const proc = async rows => {
      if (!rows?.length) { setUploadState(null); addToast('The file is empty. Fill in the template and try again.', 'error'); return; }
      const sample = rows[0];
      const hasSummaryCol = Object.keys(sample).some(k => k.toLowerCase().trim() === 'test summary');
      if (!hasSummaryCol) { setUploadState(null); addToast('Column "Test Summary" not found. Use the ⬇ Template button.', 'error'); return; }
      const valid = rows.filter(r => (r['Test Summary'] || r['test summary'])?.toString().trim());
      const skipped = rows.length - valid.length;
      if (!valid.length) { setUploadState(null); addToast(`No data to import — all ${rows.length} rows are missing a Test Summary.`, 'error'); return; }
      setUploadState({ phase: 'uploading', count: valid.length });
      try {
        const n = await dbBulkCreateTCs(rows);
        setUploadState(null);
        const parts = [`${n} test case${n !== 1 ? 's' : ''} added successfully`];
        if (skipped > 0) parts.push(`${skipped} row${skipped !== 1 ? 's' : ''} skipped`);
        addToast(parts.join(' · '), 'success');
        loadData();
      } catch (err) {
        setUploadState(null);
        const msg = (err?.message || '').toLowerCase();
        if (msg.includes('duplicate') || msg.includes('unique')) addToast('Upload failed: duplicate IDs exist.', 'error');
        else if (msg.includes('fetch') || msg.includes('network')) addToast('Upload failed: network error.', 'error');
        else addToast(`Upload failed: ${err?.message || 'please try again'}`, 'error');
      }
    };

    if (file.name.toLowerCase().endsWith('.csv')) {
      Papa.parse(file, { header: true, skipEmptyLines: true, complete: r => proc(r.data), error: err => { setUploadState(null); addToast(`Could not read CSV: ${err?.message || 'invalid format'}`, 'error'); } });
    } else {
      const r = new FileReader();
      r.onload = ev => {
        try { const wb = XLSX.read(ev.target.result, { type: 'binary' }); proc(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])); }
        catch (err) { setUploadState(null); addToast(`Could not read Excel: ${err?.message || 'unknown error'}. Make sure it is not open in Excel.`, 'error'); }
      };
      r.onerror = () => { setUploadState(null); addToast('The file could not be opened. Close it in Excel and try again.', 'error'); };
      r.readAsBinaryString(file);
    }
  };

  // Export Excel
  const dlExcel = () => {
    const HEADERS = ['Test ID','Test Summary','Priority','Pre-requisite','Actions','Expected Results','Actual Results','Test Case Type','JIRA ID','Component','Tags','Linked Plan IDs','Bug Details'];
    const rows = filtered.map(t => [
      t.id, t.summary, t.priority, t.prerequisite, t.actions, t.expectedResults,
      t.actualResults, t.type, t.jiraId, t.component, (t.tags || []).join(', '),
      (tcPlanMap[t.id] || []).join(', '), t.bugDetails || '',
    ]);
    const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...rows]);
    ws['!cols'] = [12,44,10,28,28,28,28,16,14,18,22,22,32].map(wch => ({ wch }));
    ws['!rows'] = [{ hpt: 22 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Test Cases');
    XLSX.writeFile(wb, `QA_Compass_Test_Cases_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const saveTags = async (id, tags) => { try { await dbUpdateTCTags(id, tags); loadData(); } catch {} };

  // Cell renderer — called for each col in order
  const renderCell = (col, tc) => {
    switch (col.k) {
      case 'id':             return <td key="id" className="px-3 py-2.5 font-mono text-xs text-indigo-600 dark:text-indigo-400 font-semibold">{tc.id}</td>;
      case 'summary':        return <td key="summary" className="px-3 py-2.5"><button onClick={() => setEditingTc(tc)} className="text-slate-800 dark:text-slate-100 text-xs truncate text-left w-full hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline underline-offset-2" title={tc.summary}>{tc.summary}</button></td>;
      case 'priority':       return <td key="priority" className="px-3 py-2.5">{tc.priority && <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_BADGE[tc.priority] || 'bg-slate-100 text-slate-600'}`}>{tc.priority}</span>}</td>;
      case 'prerequisite':   return <td key="prerequisite" className="px-3 py-2.5 text-slate-800 dark:text-slate-100 text-xs truncate" title={tc.prerequisite}>{tc.prerequisite}</td>;
      case 'actions':        return <td key="actions" className="px-3 py-2.5 text-slate-800 dark:text-slate-100 text-xs truncate" title={tc.actions}>{tc.actions}</td>;
      case 'expectedResults': return <td key="expectedResults" className="px-3 py-2.5 text-slate-800 dark:text-slate-100 text-xs truncate" title={tc.expectedResults}>{tc.expectedResults}</td>;
      case 'type':           return <td key="type" className="px-3 py-2.5">{tc.type && <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-xs">{tc.type}</span>}</td>;
      case 'jiraId':         return <td key="jiraId" className="px-3 py-2.5 text-slate-800 dark:text-slate-100 text-xs truncate">{tc.jiraId}</td>;
      case 'component':      return <td key="component" className="px-3 py-2.5 text-slate-800 dark:text-slate-100 text-xs truncate">{tc.component}</td>;
      case 'tags':           return <td key="tags" className="px-3 py-2.5"><TagCell id={tc.id} tags={tc.tags || []} onSave={saveTags} /></td>;
      case 'linkedPlans':    return (
        <td key="linkedPlans" className="px-3 py-2.5">
          <div className="flex flex-wrap gap-1">
            {(tcPlanMap[tc.id] || []).length === 0
              ? <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
              : (tcPlanMap[tc.id] || []).map(pId => (
                  <span key={pId} className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded text-xs font-mono">{pId}</span>
                ))}
          </div>
        </td>
      );
      case 'bugDetails':     return <td key="bugDetails" className="px-3 py-2.5"><BugList bugs={tc.bugDetails || []} onSave={bugs => saveBug(tc.id, bugs)} compact /></td>;
      default:               return <td key={col.k} />;
    }
  };

  const thClass = 'px-3 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide bg-slate-50 dark:bg-slate-800';

  return (
    <div className="p-6 dark:text-slate-100">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Test Case Repository</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{testCases.length} test cases total</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Btn variant="sm" onClick={dlTemplate}>⬇ Template</Btn>
          <Btn variant="sm" onClick={() => !uploadState && fileRef.current?.click()} disabled={!!uploadState}>
            {uploadState ? '⏳ Uploading…' : '⬆ Upload'}
          </Btn>
          <input ref={fileRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={handleUpload} />
          <Btn variant="sm" onClick={dlExcel}>⬇ Export to Excel</Btn>
          <Btn onClick={() => setShowCreate(true)}>+ Create Test Case</Btn>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-3">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search ID, Summary, JIRA, Plan ID…"
          className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm w-72 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500" />
        <select value={fC} onChange={e => setFC(e.target.value)} className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">
          <option value="">All Components</option>{comps.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={fT} onChange={e => setFT(e.target.value)} className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">
          <option value="">All Types</option>{TC_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <select value={fG} onChange={e => setFG(e.target.value)} className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">
          <option value="">All Tags</option>{allTags.map(t => <option key={t}>{t}</option>)}
        </select>
        <select value={fP} onChange={e => setFP(e.target.value)} className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">
          <option value="">All Priorities</option>{PRIORITIES.map(p => <option key={p}>{p}</option>)}
        </select>
        <select value={fPlan} onChange={e => setFPlan(e.target.value)} className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">
          <option value="">All Test Plans</option>{planIds.map(p => <option key={p}>{p}</option>)}
        </select>
      </div>

      {/* Upload progress banner */}
      {uploadState && (
        <div className="flex items-center gap-3 px-4 py-3 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-lg mb-3">
          <div className="spin shrink-0" style={{ width: 18, height: 18, border: '2.5px solid #c7d2fe', borderTopColor: '#4f46e5', borderRadius: '50%' }} />
          <div>
            <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
              {uploadState.phase === 'reading'
                ? 'Reading file…'
                : `Uploading ${uploadState.count} test case${uploadState.count !== 1 ? 's' : ''}…`}
            </p>
            <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-0.5">
              {uploadState.phase === 'reading'
                ? 'Parsing your spreadsheet'
                : 'Saving to database — this may take a moment for large files'}
            </p>
          </div>
        </div>
      )}

      {/* Selection bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-lg mb-3">
          <span className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">
            {selectedIds.size} test case{selectedIds.size !== 1 ? 's' : ''} selected
            {selectedIds.size < filtered.length && (
              <button onClick={() => setSelectedIds(new Set(filtered.map(t => t.id)))}
                className="ml-3 text-indigo-500 underline underline-offset-2 hover:text-indigo-700 text-xs font-normal">
                Select all {filtered.length} results
              </button>
            )}
          </span>
          <div className="flex items-center gap-2">
            <button onClick={() => setSelectedIds(new Set())} className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 px-2 py-1">Clear selection</button>
            <button onClick={() => setShowConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">
              🗑 Delete {selectedIds.size} selected
            </button>
          </div>
        </div>
      )}

      {/* Resize hint */}
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-1.5">
        ↔ Drag column edges to resize · ✥ Drag headers to reorder
      </p>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table style={{ tableLayout: 'fixed', width: '100%', minWidth: `${44 + cols.reduce((s, c) => s + parseFloat(c.w), 0)}px` }} className="text-sm">
            <colgroup>
              <col style={{ width: '44px' }} />
              {cols.map(c => <col key={c.k} style={{ width: c.w }} />)}
            </colgroup>
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className={`${thClass} text-center`}>
                  <Checkbox checked={allFilteredSelected} indeterminate={someSelected} onChange={toggleAll} />
                </th>
                {cols.map(col => (
                  <ResizableTh key={col.k} col={col} startResize={startResize} drag={drag} dragOver={dragOver}
                    className={thClass}
                    onClick={col.s ? () => sort(col.s) : undefined}>
                    {col.l}{col.s && <SH col={col.s} sortCol={sortCol} sortDir={sortDir} />}
                  </ResizableTh>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {paged.length === 0 ? (
                <tr><td colSpan={cols.length + 1} className="text-center py-16">
                  <div className="text-4xl mb-2">📋</div>
                  <p className="text-slate-400 dark:text-slate-500 text-sm">
                    {testCases.length === 0 ? 'No test cases yet — create one or upload from a template' : 'No test cases match the current filters'}
                  </p>
                </td></tr>
              ) : paged.map(tc => (
                <tr key={tc.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/60 ${selectedIds.has(tc.id) ? 'bg-indigo-50/60 dark:bg-indigo-900/20' : ''}`}>
                  <td className="px-3 py-2.5 text-center">
                    <Checkbox checked={selectedIds.has(tc.id)} onChange={() => toggleOne(tc.id)} />
                  </td>
                  {cols.map(col => renderCell(col, tc))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination total={filtered.length} page={page} perPage={PER_PAGE} onChange={setPage} />
      </div>

      {showCreate && <CreateTCModal onClose={() => setShowCreate(false)} onCreated={() => loadData()} addToast={addToast} previewId="Auto-generated" />}
      {editingTc  && <EditTCModal tc={editingTc} onClose={() => setEditingTc(null)} onSaved={() => loadData()} addToast={addToast} />}

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-6 max-w-sm w-full border border-slate-100 dark:border-slate-700">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-2">Delete {selectedIds.size} test case{selectedIds.size !== 1 ? 's' : ''}?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">This will permanently remove the selected test cases and unlink them from any test plans.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowConfirm(false)} disabled={deleting}
                className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50">Cancel</button>
              <button onClick={confirmDelete} disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2">
                {deleting ? <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full spin inline-block" /> Deleting…</> : `Delete ${selectedIds.size}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
