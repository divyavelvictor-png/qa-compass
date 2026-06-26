import { useState, useEffect, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { PRIORITIES, TC_TYPES, PER_PAGE, PRIORITY_BADGE } from '../lib/constants';
import { dbBulkCreateTCs, dbUpdateTCTags, dbDeleteTCs, dbUpdateTCBugs } from '../lib/db';
import { useTableState } from '../lib/useTableState';
import { ResizableTh } from '../components/ResizableTh';
import { BugList } from '../components/BugList';
import { MultiSelect, matchMulti, matchMultiTags, NONE_VAL } from '../components/MultiSelect';
import { Btn, SH, Pagination } from '../components/ui';
import CreateTCModal from '../components/CreateTCModal';
import EditTCModal   from '../components/EditTCModal';
import TagCell from '../components/TagCell';

function Checkbox({ checked, indeterminate, onChange, className = '' }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = !checked && !!indeterminate; }, [checked, indeterminate]);
  return <input ref={ref} type="checkbox" checked={checked} onChange={onChange}
    className={`w-4 h-4 rounded border-slate-300 accent-indigo-600 cursor-pointer ${className}`} />;
}

const INIT_COLS = [
  { l: 'Test ID',          k: 'id',             w: '95px',  s: 'id' },
  { l: 'Test Summary',     k: 'summary',         w: '200px' },
  { l: 'Priority',         k: 'priority',        w: '88px',  s: 'priority' },
  { l: 'Pre-requisite',    k: 'prerequisite',    w: '130px' },
  { l: 'Actions',          k: 'actions',         w: '130px' },
  { l: 'Data',             k: 'testData',        w: '130px' },
  { l: 'Expected Results', k: 'expectedResults', w: '130px' },
  { l: 'Test Case Type',   k: 'type',            w: '110px', s: 'type' },
  { l: 'JIRA ID',          k: 'jiraId',          w: '90px' },
  { l: 'Component',        k: 'component',       w: '110px', s: 'component' },
  { l: 'Tags',             k: 'tags',            w: '155px' },
  { l: 'Linked Plans',     k: 'linkedPlans',     w: '145px' },
  { l: 'Bug Details',      k: 'bugDetails',      w: '165px' },
];

export default function TestCaseRepository({ testCases, testPlans = [], loadData, addToast }) {
  const [search, setSearch]   = useState('');
  const [ds, setDs]           = useState('');
  const [fC, setFC] = useState([]);
  const [fT, setFT] = useState([]);
  const [fG, setFG] = useState([]);
  const [fP, setFP] = useState([]);
  const [fPlan, setFPlan]     = useState([]);
  const [sortCol, setSortCol] = useState('id');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage]       = useState(1);
  const [showCreate, setShowCreate]   = useState(false);
  const [editingTc,  setEditingTc]    = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting]       = useState(false);
  const [uploadState, setUploadState] = useState(null);
  const fileRef = useRef(null);
  const dbRef   = useRef(null);

  const { cols, startResize, drag, dragOver } = useTableState('tcrepo', INIT_COLS);

  useEffect(() => {
    clearTimeout(dbRef.current);
    dbRef.current = setTimeout(() => setDs(search), 300);
    return () => clearTimeout(dbRef.current);
  }, [search]);

  const hasFilters = search || fC.length > 0 || fT.length > 0 || fG.length > 0 || fP.length > 0 || fPlan.length > 0;

  useEffect(() => { setPage(1); setSelectedIds(new Set()); }, [ds, fC, fT, fG, fP, fPlan]);

  const resetFilters = () => { setSearch(''); setFC([]); setFT([]); setFG([]); setFP([]); setFPlan([]); };

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
    if (fC.length > 0)    d = d.filter(t => matchMulti(t.component, fC));
    if (fT.length > 0)    d = d.filter(t => matchMulti(t.type, fT));
    if (fG.length > 0)    d = d.filter(t => matchMultiTags(t.tags, fG));
    if (fP.length > 0)    d = d.filter(t => matchMulti(t.priority, fP));
    if (fPlan.length > 0) {
      d = d.filter(t => {
        const plans = tcPlanMap[t.id] || [];
        if (fPlan.includes(NONE_VAL) && plans.length === 0) return true;
        const others = fPlan.filter(v => v !== NONE_VAL);
        return others.length > 0 && others.some(p => plans.includes(p));
      });
    }
    d.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      return (a[sortCol] || '') < (b[sortCol] || '') ? -dir : (a[sortCol] || '') > (b[sortCol] || '') ? dir : 0;
    });
    return d;
  }, [testCases, ds, fC, fT, fG, fP, fPlan, sortCol, sortDir, tcPlanMap]);

  const paged = useMemo(() => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE), [filtered, page]);
  const sort  = col => { setSortDir(d => sortCol === col ? (d === 'asc' ? 'desc' : 'asc') : 'asc'); setSortCol(col); };

  const allFilteredSelected = filtered.length > 0 && filtered.every(t => selectedIds.has(t.id));
  const someSelected        = selectedIds.size > 0 && !allFilteredSelected;
  const toggleOne = id => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelectedIds(allFilteredSelected ? new Set() : new Set(filtered.map(t => t.id)));

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await dbDeleteTCs([...selectedIds]);
      addToast(`${selectedIds.size} test case${selectedIds.size !== 1 ? 's' : ''} deleted`, 'success');
      setSelectedIds(new Set()); setShowConfirm(false); loadData();
    } catch { addToast('Failed to delete.', 'error'); }
    setDeleting(false);
  };

  const saveBug = async (id, bugs) => {
    try { await dbUpdateTCBugs(id, bugs); loadData(); }
    catch { addToast('Failed to save bug details.', 'error'); }
  };

  const dlTemplate = () => {
    const headers = [
      'Test Summary', 'Priority', 'Pre-Requisite', 'Actions', 'Data (Optional)',
      'Expected Results', 'Test Case Type', 'JIRA ID (Optional)', 'Component',
      'Tags (Optional)', 'Bug Details (Optional)',
    ];
    const hints = [
      'Enter the test case description', 'High | Medium | Low',
      'Conditions that must be met before execution', 'Step-by-step actions to execute the test',
      'Optional — test input data or parameters',
      'Expected outcome after executing the actions', 'UI | Functional | Accessibility',
      'Optional — e.g. PROJ-123', 'e.g. Login, Checkout',
      'Optional — comma-separated e.g. smoke, regression',
      'Optional — e.g. BUG-123 Login fails on mobile',
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, hints]);
    ws['!cols'] = [42,22,32,32,28,32,24,14,20,28,32].map(wch => ({ wch }));
    ws['!rows'] = [{ hpt: 22 }, { hpt: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Test Case Template');
    XLSX.writeFile(wb, 'test_case_template.xlsx');
  };

  const handleUpload = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploadState({ phase: 'reading' });

    const proc = async rows => {
      if (!rows?.length) { setUploadState(null); addToast('The file is empty.', 'error'); return; }
      const hasSummaryCol = Object.keys(rows[0]).some(k => k.toLowerCase().trim() === 'test summary');
      if (!hasSummaryCol) { setUploadState(null); addToast('Column "Test Summary" not found. Use the ⬇ Template button.', 'error'); return; }
      const valid = rows.filter(r => (r['Test Summary'] || r['test summary'])?.toString().trim());
      const skipped = rows.length - valid.length;
      if (!valid.length) { setUploadState(null); addToast(`No data — all ${rows.length} rows missing Test Summary.`, 'error'); return; }
      setUploadState({ phase: 'uploading', count: valid.length });
      try {
        const n = await dbBulkCreateTCs(rows);
        setUploadState(null);
        const parts = [`${n} test case${n !== 1 ? 's' : ''} added`];
        if (skipped > 0) parts.push(`${skipped} skipped`);
        addToast(parts.join(' · '), 'success');
        loadData();
      } catch (err) {
        setUploadState(null);
        const msg = (err?.message || '').toLowerCase();
        if (msg.includes('duplicate')) addToast('Upload failed: duplicate IDs.', 'error');
        else if (msg.includes('fetch') || msg.includes('network')) addToast('Upload failed: network error.', 'error');
        else addToast(`Upload failed: ${err?.message || 'please try again'}`, 'error');
      }
    };

    if (file.name.toLowerCase().endsWith('.csv')) {
      Papa.parse(file, { header: true, skipEmptyLines: true, complete: r => proc(r.data), error: err => { setUploadState(null); addToast(`CSV error: ${err?.message}`, 'error'); } });
    } else {
      const r = new FileReader();
      r.onload = ev => { try { const wb = XLSX.read(ev.target.result, { type: 'binary' }); proc(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])); } catch (err) { setUploadState(null); addToast(`Excel error: ${err?.message}`, 'error'); } };
      r.onerror = () => { setUploadState(null); addToast('Cannot open file. Close it in Excel and retry.', 'error'); };
      r.readAsBinaryString(file);
    }
  };

  const dlExcel = () => {
    const HEADERS = ['Test ID','Test Summary','Priority','Pre-requisite','Actions','Data','Expected Results','Actual Results','Test Case Type','JIRA ID','Component','Tags','Linked Plan IDs','Bug Details'];
    const rows = filtered.map(t => [
      t.id, t.summary, t.priority, t.prerequisite, t.actions, t.testData || '',
      t.expectedResults, t.actualResults, t.type, t.jiraId, t.component,
      (t.tags || []).join(', '), (tcPlanMap[t.id] || []).join(', '),
      (t.bugDetails || []).join('; '),
    ]);
    const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...rows]);
    ws['!cols'] = [12,44,10,28,28,22,28,28,16,14,18,22,22,32].map(wch => ({ wch }));
    ws['!rows'] = [{ hpt: 22 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Test Cases');
    XLSX.writeFile(wb, `QA_Compass_Test_Cases_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const saveTags = async (id, tags) => { try { await dbUpdateTCTags(id, tags); loadData(); } catch {} };

  const renderCell = (col, tc) => {
    switch (col.k) {
      case 'id':             return <td key="id" className="px-3 py-2.5 font-mono text-xs text-indigo-600 dark:text-indigo-400 font-semibold">{tc.id}</td>;
      case 'summary':        return <td key="summary" className="px-3 py-2.5"><button onClick={() => setEditingTc(tc)} className="text-slate-800 dark:text-slate-100 text-xs truncate text-left w-full hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline" title={tc.summary}>{tc.summary}</button></td>;
      case 'priority':       return <td key="priority" className="px-3 py-2.5">{tc.priority && <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_BADGE[tc.priority] || 'bg-slate-100 text-slate-600'}`}>{tc.priority}</span>}</td>;
      case 'prerequisite':   return <td key="prerequisite" className="px-3 py-2.5 text-slate-800 dark:text-slate-100 text-xs truncate" title={tc.prerequisite}>{tc.prerequisite}</td>;
      case 'actions':        return <td key="actions" className="px-3 py-2.5 text-slate-800 dark:text-slate-100 text-xs truncate" title={tc.actions}>{tc.actions}</td>;
      case 'testData':       return <td key="testData" className="px-3 py-2.5 text-slate-800 dark:text-slate-100 text-xs truncate" title={tc.testData}>{tc.testData}</td>;
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
          className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500" />
        <MultiSelect options={comps}     selected={fC}    onChange={setFC}    placeholder="Components" noneLabel="No Components" className="w-40" />
        <MultiSelect options={TC_TYPES}  selected={fT}    onChange={setFT}    placeholder="Types"      noneLabel="No Types"      className="w-36" />
        <MultiSelect options={allTags}   selected={fG}    onChange={setFG}    placeholder="Tags"       noneLabel="No Tags"       className="w-36" />
        <MultiSelect options={PRIORITIES} selected={fP}   onChange={setFP}    placeholder="Priorities" noneLabel="No Priorities" className="w-36" />
        <MultiSelect options={planIds}   selected={fPlan} onChange={setFPlan} placeholder="Test Plans"  noneLabel="No Test Plans" className="w-36" />
        {hasFilters && (
          <button onClick={resetFilters}
            className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1">
            ↺ Reset
          </button>
        )}
      </div>

      {uploadState && (
        <div className="flex items-center gap-3 px-4 py-3 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-lg mb-3">
          <div className="spin shrink-0" style={{ width: 18, height: 18, border: '2.5px solid #c7d2fe', borderTopColor: '#4f46e5', borderRadius: '50%' }} />
          <div>
            <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
              {uploadState.phase === 'reading' ? 'Reading file…' : `Uploading ${uploadState.count} test cases…`}
            </p>
            <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-0.5">
              {uploadState.phase === 'reading' ? 'Parsing your spreadsheet' : 'Saving to database'}
            </p>
          </div>
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-lg mb-3">
          <span className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">
            {selectedIds.size} selected
            {selectedIds.size < filtered.length && (
              <button onClick={() => setSelectedIds(new Set(filtered.map(t => t.id)))} className="ml-3 text-indigo-500 underline text-xs">
                Select all {filtered.length}
              </button>
            )}
          </span>
          <div className="flex items-center gap-2">
            <button onClick={() => setSelectedIds(new Set())} className="text-xs text-slate-500 dark:text-slate-400 px-2 py-1">Clear</button>
            <button onClick={() => setShowConfirm(true)} className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">
              🗑 Delete {selectedIds.size}
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-400 dark:text-slate-500 mb-1.5">↔ Drag column edges to resize · ✥ Drag headers to reorder</p>

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
                    className={thClass} onClick={col.s ? () => sort(col.s) : undefined}>
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
                    {testCases.length === 0 ? 'No test cases yet' : 'No test cases match the current filters'}
                  </p>
                  {hasFilters && <button onClick={resetFilters} className="mt-2 text-xs text-indigo-500 hover:text-indigo-700 underline">Reset filters</button>}
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
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">This will permanently remove them and unlink from any test plans.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowConfirm(false)} disabled={deleting} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700">Cancel</button>
              <button onClick={confirmDelete} disabled={deleting} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 flex items-center gap-2">
                {deleting ? <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full spin inline-block" /> Deleting…</> : `Delete ${selectedIds.size}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
