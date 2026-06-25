import { useState, useEffect, useRef, useMemo } from 'react';
import { PRIORITIES, TC_TYPES, PER_PAGE, PRIORITY_BADGE } from '../lib/constants';
import { dbCreateTP, dbUpdateTPIds, dbDeleteTPs, dbGetNextTPId } from '../lib/db';
import { Btn, SH, Pagination, Modal, Fld, Inp, Txa, Sel } from '../components/ui';
import { ChipInput } from '../components/ui';
import CreateTCModal from '../components/CreateTCModal';
import TCPickerModal  from '../components/TCPickerModal';

// ── Test Plan Detail ────────────────────────────────────
function TestPlanDetail({ plan, testCases, loadData, addToast, onBack }) {
  const [showPicker, setShowPicker] = useState(false);
  const [page, setPage]   = useState(1);
  const [fC, setFC] = useState(''); const [fT, setFT] = useState(''); const [fP, setFP] = useState('');
  const [srch, setSrch]   = useState('');
  const [ds, setDs]       = useState('');
  const [showCr, setShowCr] = useState(false);
  const dbRef = useRef(null);

  useEffect(() => {
    clearTimeout(dbRef.current);
    dbRef.current = setTimeout(() => setDs(srch), 300);
    return () => clearTimeout(dbRef.current);
  }, [srch]);
  useEffect(() => setPage(1), [ds, fC, fT, fP]);

  const linked = useMemo(
    () => testCases.filter(tc => (plan.testCaseIds || []).includes(tc.id)),
    [plan, testCases]
  );
  const comps = useMemo(
    () => [...new Set(linked.map(t => t.component).filter(Boolean))].sort(),
    [linked]
  );
  const filtered = useMemo(() => {
    let d = [...linked];
    if (ds) { const q = ds.toLowerCase(); d = d.filter(t => (t.id || '').toLowerCase().includes(q) || (t.summary || '').toLowerCase().includes(q)); }
    if (fC) d = d.filter(t => t.component === fC);
    if (fT) d = d.filter(t => t.type === fT);
    if (fP) d = d.filter(t => t.priority === fP);
    return d;
  }, [linked, ds, fC, fT, fP]);

  const paged = useMemo(() => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE), [filtered, page]);

  // Called when user confirms selection in the picker modal
  const handleAddFromPicker = async (ids) => {
    if (!ids.length) return;
    try {
      const newIds = [...new Set([...(plan.testCaseIds || []), ...ids])];
      await dbUpdateTPIds(plan.id, newIds);
      addToast(`${ids.length} test case${ids.length !== 1 ? 's' : ''} added to plan`, 'success');
      loadData();
    } catch { addToast('Unable to link test cases. Please try again', 'error'); }
  };

  const COLS = [
    { l: 'Test ID',         w: '95px' }, { l: 'Test Summary',    w: '200px' },
    { l: 'Priority',        w: '88px' }, { l: 'Pre-requisite',   w: '135px' },
    { l: 'Actions',         w: '135px'}, { l: 'Expected Results',w: '135px' },
    { l: 'Test Case Type',  w: '110px'}, { l: 'JIRA ID',         w: '88px'  },
    { l: 'Components',      w: '110px'}, { l: 'Tags',            w: '165px' },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="px-3 py-2 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">← Back</button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">{plan.id}</h1>
          {plan.summary && <p className="text-slate-500 text-sm">{plan.summary}</p>}
        </div>
      </div>

      {/* Plan metadata */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Plan Details</h2>
        <div className="flex flex-wrap gap-6">
          {[['Sprint', plan.sprint], ['Fix Versions', plan.fixVersions], ['Release', plan.release], ['Component', plan.component]].map(([k, v]) => v && (
            <div key={k}><p className="text-xs text-slate-500">{k}</p><p className="text-sm font-semibold text-slate-800 mt-0.5">{v}</p></div>
          ))}
          {(plan.labels || []).length > 0 && (
            <div>
              <p className="text-xs text-slate-500">Labels</p>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {plan.labels.map(l => <span key={l} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">{l}</span>)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Link TCs */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Link Test Cases</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPicker(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
            + Add Test Cases
          </button>
          <button onClick={() => setShowCr(true)}
            className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
            + New Test Case
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input value={srch} onChange={e => setSrch(e.target.value)} placeholder="Search test cases…"
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm w-52 focus:outline-none" />
        <select value={fC} onChange={e => setFC(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
          <option value="">All Components</option>{comps.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={fT} onChange={e => setFT(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
          <option value="">All Types</option>{TC_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <select value={fP} onChange={e => setFP(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
          <option value="">All Priorities</option>{PRIORITIES.map(p => <option key={p}>{p}</option>)}
        </select>
        <span className="ml-auto text-sm text-slate-500 self-center">{linked.length} linked</span>
      </div>

      {/* Linked TC table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table style={{ tableLayout: 'fixed', minWidth: '1261px', width: '100%' }} className="text-sm">
            <colgroup>{COLS.map((c, i) => <col key={i} style={{ width: c.w }} />)}</colgroup>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {COLS.map(c => <th key={c.l} className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">{c.l}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paged.length === 0
                ? <tr><td colSpan={10} className="text-center py-12 text-slate-400 text-sm">{linked.length === 0 ? 'No test cases linked yet' : 'No test cases match the current filters'}</td></tr>
                : paged.map(tc => (
                  <tr key={tc.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 font-mono text-xs text-indigo-600 font-semibold">{tc.id}</td>
                    <td className="px-3 py-2.5 text-slate-800 text-xs truncate">{tc.summary}</td>
                    <td className="px-3 py-2.5">{tc.priority && <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_BADGE[tc.priority] || 'bg-slate-100 text-slate-600'}`}>{tc.priority}</span>}</td>
                    <td className="px-3 py-2.5 text-slate-500 text-xs truncate">{tc.prerequisite}</td>
                    <td className="px-3 py-2.5 text-slate-500 text-xs truncate">{tc.actions}</td>
                    <td className="px-3 py-2.5 text-slate-500 text-xs truncate">{tc.expectedResults}</td>
                    <td className="px-3 py-2.5">{tc.type && <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">{tc.type}</span>}</td>
                    <td className="px-3 py-2.5 text-slate-500 text-xs">{tc.jiraId}</td>
                    <td className="px-3 py-2.5 text-slate-500 text-xs">{tc.component}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">{(tc.tags || []).map(t => <span key={t} className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs">{t}</span>)}</div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <Pagination total={filtered.length} page={page} perPage={PER_PAGE} onChange={setPage} />
      </div>

      {showCr && (
        <CreateTCModal
          onClose={() => setShowCr(false)}
          onCreated={async tc => {
            try {
              await dbUpdateTPIds(plan.id, [...new Set([...(plan.testCaseIds || []), tc.id])]);
              loadData();
            } catch {}
          }}
          addToast={addToast}
          previewId="Auto-generated"
        />
      )}

      {showPicker && (
        <TCPickerModal
          testCases={testCases}
          alreadyLinked={plan.testCaseIds || []}
          onAdd={handleAddFromPicker}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}

// Handles native indeterminate state
function Checkbox({ checked, indeterminate, onChange, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !checked && !!indeterminate;
  }, [checked, indeterminate]);
  return (
    <input ref={ref} type="checkbox" checked={checked} onChange={onChange}
      className={`w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600 ${className}`} />
  );
}

// ── Test Plan List ──────────────────────────────────────
export default function TestPlan({ testCases, testPlans, loadData, addToast }) {
  const [view, setView]     = useState('list');
  const [sel, setSel]       = useState(null);
  const [srch, setSrch]     = useState('');
  const [ds, setDs]         = useState('');
  const [fC, setFC] = useState(''); const [fL, setFL] = useState('');
  const [sortCol, setSortCol] = useState('id');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage]     = useState(1);
  const [showCr, setShowCr] = useState(false);
  const [nextTpId, setNextTpId] = useState('Auto-generated');
  const [cF, setCF] = useState({ summary: '', fixVersions: '', release: '', sprint: '', labels: [], component: '' });
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting]       = useState(false);
  const dbRef = useRef(null);

  useEffect(() => {
    clearTimeout(dbRef.current);
    dbRef.current = setTimeout(() => setDs(srch), 300);
    return () => clearTimeout(dbRef.current);
  }, [srch]);
  useEffect(() => setPage(1), [ds, fC, fL]);
  useEffect(() => setSelectedIds(new Set()), [ds, fC, fL]);

  const comps  = useMemo(() => [...new Set(testPlans.map(p => p.component).filter(Boolean))].sort(), [testPlans]);
  const labels = useMemo(() => [...new Set(testPlans.flatMap(p => p.labels || []))].sort(), [testPlans]);

  const filtered = useMemo(() => {
    let d = [...testPlans];
    if (ds) { const q = ds.toLowerCase(); d = d.filter(p => (p.id || '').toLowerCase().includes(q) || (p.summary || '').toLowerCase().includes(q)); }
    if (fC) d = d.filter(p => p.component === fC);
    if (fL) d = d.filter(p => (p.labels || []).includes(fL));
    d.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      return (a[sortCol] || '') < (b[sortCol] || '') ? -dir : (a[sortCol] || '') > (b[sortCol] || '') ? dir : 0;
    });
    return d;
  }, [testPlans, ds, fC, fL, sortCol, sortDir]);

  const paged = useMemo(() => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE), [filtered, page]);
  const sort  = col => { setSortDir(d => sortCol === col ? (d === 'asc' ? 'desc' : 'asc') : 'asc'); setSortCol(col); };

  // ── Selection ──
  const allFilteredSelected = filtered.length > 0 && filtered.every(p => selectedIds.has(p.id));
  const someSelected        = selectedIds.size > 0 && !allFilteredSelected;

  const toggleOne = id =>
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleAll = () =>
    setSelectedIds(allFilteredSelected ? new Set() : new Set(filtered.map(p => p.id)));

  // ── Delete ──
  const confirmDelete = async () => {
    setDeleting(true);
    try {
      const ids = [...selectedIds];
      await dbDeleteTPs(ids);
      addToast(`${ids.length} test plan${ids.length !== 1 ? 's' : ''} deleted`, 'success');
      setSelectedIds(new Set());
      setShowConfirm(false);
      loadData();
    } catch {
      addToast('Failed to delete. Please try again.', 'error');
    }
    setDeleting(false);
  };

  const openCreate = async () => {
    setCF({ summary: '', fixVersions: '', release: '', sprint: '', labels: [], component: '' });
    setNextTpId('Auto-generated');
    setShowCr(true);
    try {
      const id = await dbGetNextTPId();
      setNextTpId(id);
    } catch { /* keep Auto-generated */ }
  };

  const create = async () => {
    try {
      await dbCreateTP(cF);
      addToast('Test plan created successfully', 'success');
      setCF({ summary: '', fixVersions: '', release: '', sprint: '', labels: [], component: '' });
      setShowCr(false);
      loadData();
    } catch { addToast('Unable to create test plan. Please try again', 'error'); }
  };

  if (view === 'detail' && sel) {
    const current = testPlans.find(p => p.id === sel.id) || sel;
    return (
      <TestPlanDetail plan={current} testCases={testCases} loadData={loadData} addToast={addToast}
        onBack={() => { setView('list'); setSel(null); }} />
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Test Plans</h1>
          <p className="text-sm text-slate-500 mt-0.5">{testPlans.length} plans total</p>
        </div>
        <Btn onClick={openCreate}>+ Create Test Plan</Btn>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <input value={srch} onChange={e => setSrch(e.target.value)} placeholder="Search plan ID or summary…"
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        <select value={fC} onChange={e => setFC(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
          <option value="">All Components</option>{comps.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={fL} onChange={e => setFL(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
          <option value="">All Labels</option>{labels.map(l => <option key={l}>{l}</option>)}
        </select>
      </div>

      {/* Selection action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-indigo-50 border border-indigo-200 rounded-lg mb-3">
          <span className="text-sm text-indigo-700 font-medium">
            {selectedIds.size} test plan{selectedIds.size !== 1 ? 's' : ''} selected
            {selectedIds.size < filtered.length && (
              <button
                onClick={() => setSelectedIds(new Set(filtered.map(p => p.id)))}
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

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table style={{ tableLayout: 'fixed', minWidth: '944px', width: '100%' }} className="text-sm">
            <colgroup>
              <col style={{ width: '44px' }} />
              {[105, 220, 120, 120, 110, 120, 150, 120].map((w, i) => <col key={i} style={{ width: w + 'px' }} />)}
            </colgroup>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-3 py-3 text-center">
                  <Checkbox checked={allFilteredSelected} indeterminate={someSelected} onChange={toggleAll} />
                </th>
                {[['Plan ID', 'id'], ['Plan Summary', null], ['Sprint', null], ['Fix Versions', null], ['Release', null], ['Component', 'component'], ['Labels', null], ['Test Cases', null]].map(([l, s]) => (
                  <th key={l} onClick={s ? () => sort(s) : undefined}
                    className={`px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide ${s ? 'cursor-pointer hover:bg-slate-100 select-none' : ''}`}>
                    {l}{s && <SH col={s} sortCol={sortCol} sortDir={sortDir} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paged.length === 0
                ? <tr><td colSpan={9} className="text-center py-16"><div className="text-4xl mb-2">📁</div><p className="text-slate-400 text-sm">{testPlans.length === 0 ? 'No test plans yet' : 'No plans match the current filters'}</p></td></tr>
                : paged.map(p => (
                  <tr key={p.id} className={`hover:bg-slate-50 ${selectedIds.has(p.id) ? 'bg-indigo-50/60' : ''}`}>
                    <td className="px-3 py-2.5 text-center">
                      <Checkbox checked={selectedIds.has(p.id)} onChange={() => toggleOne(p.id)} />
                    </td>
                    <td className="px-3 py-2.5"><button onClick={() => { setSel(p); setView('detail'); }} className="font-mono text-xs text-indigo-600 font-semibold hover:underline">{p.id}</button></td>
                    <td className="px-3 py-2.5"><button onClick={() => { setSel(p); setView('detail'); }} className="text-slate-800 text-xs truncate text-left w-full hover:text-indigo-600">{p.summary || '—'}</button></td>
                    <td className="px-3 py-2.5 text-slate-600 text-xs">{p.sprint}</td>
                    <td className="px-3 py-2.5 text-slate-600 text-xs truncate">{p.fixVersions}</td>
                    <td className="px-3 py-2.5 text-slate-600 text-xs truncate">{p.release}</td>
                    <td className="px-3 py-2.5 text-slate-600 text-xs truncate">{p.component}</td>
                    <td className="px-3 py-2.5"><div className="flex flex-wrap gap-1">{(p.labels || []).map(l => <span key={l} className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">{l}</span>)}</div></td>
                    <td className="px-3 py-2.5 text-center text-slate-600 text-xs font-medium">{(p.testCaseIds || []).length}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <Pagination total={filtered.length} page={page} perPage={PER_PAGE} onChange={setPage} />
      </div>

      {showCr && (
        <Modal title="Create Test Plan" onClose={() => setShowCr(false)}
          footer={<><Btn variant="ghost" onClick={() => setShowCr(false)}>Cancel</Btn><Btn onClick={create}>Create</Btn></>}>
          <Fld label="Test Plan ID"><Inp value={nextTpId} disabled /></Fld>
          <Fld label="Sprint"><Inp value={cF.sprint} onChange={e => setCF(f => ({ ...f, sprint: e.target.value }))} placeholder="e.g. Sprint 14" /></Fld>
          <Fld label="Test Plan Summary"><Inp value={cF.summary} onChange={e => setCF(f => ({ ...f, summary: e.target.value }))} /></Fld>
          <Fld label="Fix Versions"><Inp value={cF.fixVersions} onChange={e => setCF(f => ({ ...f, fixVersions: e.target.value }))} /></Fld>
          <Fld label="Release"><Inp value={cF.release} onChange={e => setCF(f => ({ ...f, release: e.target.value }))} /></Fld>
          <Fld label="Component"><Inp value={cF.component} onChange={e => setCF(f => ({ ...f, component: e.target.value }))} /></Fld>
          <Fld label="Labels"><ChipInput chips={cF.labels} onChange={labels => setCF(f => ({ ...f, labels }))} placeholder="Add label…" /></Fld>
        </Modal>
      )}

      {/* Delete confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="text-base font-semibold text-slate-800 mb-2">
              Delete {selectedIds.size} test plan{selectedIds.size !== 1 ? 's' : ''}?
            </h3>
            <p className="text-sm text-slate-500 mb-5">
              This will permanently delete the selected test plans and all their execution records.
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowConfirm(false)} disabled={deleting}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50">
                Cancel
              </button>
              <button onClick={confirmDelete} disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2">
                {deleting
                  ? <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full spin inline-block" /> Deleting…</>
                  : `Delete ${selectedIds.size}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
