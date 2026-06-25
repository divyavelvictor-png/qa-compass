import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { tpFromDb, dbGetExecForPlan, dbUpsertExec, dbGetAllExecGrouped } from '../lib/db';
import { EXEC_STATUSES, STATUS_ROW, PER_PAGE } from '../lib/constants';
import { Btn, Inp, Pagination } from '../components/ui';

// Inline styles — Tailwind bg-* unreliable on native <select> in Chrome/Windows
const STATUS_SELECT_STYLE = {
  'Pass':         { backgroundColor: '#dcfce7', color: '#166534', borderColor: 'transparent' },
  'Fail':         { backgroundColor: '#fee2e2', color: '#991b1b', borderColor: 'transparent' },
  'Rerun - Pass': { backgroundColor: '#fef3c7', color: '#92400e', borderColor: 'transparent' },
  'Rerun - Fail': { backgroundColor: '#fecaca', color: '#991b1b', borderColor: 'transparent' },
};

const LAST_PLAN_KEY = 'qa_last_exec_plan_id';

// ── Exec Row ─────────────────────────────────────────────
function ExecRow({ tc, exec, planId, onUpdate }) {
  const [bugId,     setBugId]     = useState(exec.bugId     || '');
  const [assignee,  setAssignee]  = useState(exec.assignee  || '');
  const [createdOn, setCreatedOn] = useState(exec.createdOn || new Date().toISOString().split('T')[0]);
  const [tip, setTip] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    setBugId(exec.bugId || '');
    setAssignee(exec.assignee || '');
    if (exec.createdOn) setCreatedOn(exec.createdOn);
  }, [exec.bugId, exec.assignee, exec.createdOn]);

  const persist = async updates => {
    const base    = { tcId: tc.id, planId, createdOn, ...exec };
    const updated = { ...base, ...updates };
    try { await dbUpsertExec(planId, tc.id, updated); onUpdate(tc.id, updated); } catch {}
  };

  const handleStatus = e =>
    persist({ status: e.target.value, executedOn: e.target.value ? new Date().toISOString() : null });

  const handleAttach = async e => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert('File exceeds 10 MB'); return; }
    const allowed = ['jpg','jpeg','png','gif','webp','doc','docx','mp4','mov','avi','zip','tar','gz'];
    if (!allowed.includes(file.name.split('.').pop()?.toLowerCase())) { alert('Unsupported file type'); return; }
    const meta = { name: file.name, size: file.size, type: file.type, uploadedAt: new Date().toISOString() };
    await persist({ artifacts: [...(exec.artifacts || []), meta] });
  };

  const fmt = iso => {
    try { return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return iso; }
  };

  return (
    <tr className={exec.status ? (STATUS_ROW[exec.status] || '') : ''}>
      <td className="px-3 py-2.5 text-slate-800 text-xs font-medium truncate" title={tc.summary}>{tc.summary}</td>
      <td className="px-3 py-2.5 text-slate-500 text-xs truncate" title={tc.prerequisite}>{tc.prerequisite}</td>
      <td className="px-3 py-2.5 text-slate-500 text-xs truncate" title={tc.actions}>{tc.actions}</td>
      <td className="px-3 py-2.5 text-slate-500 text-xs truncate" title={tc.expectedResults}>{tc.expectedResults}</td>
      <td className="px-3 py-2.5">
        <select value={exec.status || ''} onChange={handleStatus}
          style={exec.status ? STATUS_SELECT_STYLE[exec.status] : {}}
          className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none cursor-pointer font-medium bg-white text-slate-500">
          <option value="">— Not Executed —</option>
          {EXEC_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </td>
      <td className="px-3 py-2.5">
        <input value={bugId} onChange={e => setBugId(e.target.value)} onBlur={() => persist({ bugId })}
          placeholder="BUG-XXX"
          className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none bg-transparent" />
      </td>
      <td className="px-3 py-2.5">
        <div className="space-y-0.5">
          {(exec.artifacts || []).map((a, i) => (
            <div key={i} className="relative">
              <button className="text-xs text-indigo-600 hover:underline truncate max-w-full block" title={a.name}
                onMouseEnter={() => setTip(i)} onMouseLeave={() => setTip(false)}>
                📎 {a.name}
              </button>
              {tip === i && (
                <div className="absolute bottom-full left-0 z-20 bg-slate-800 text-white text-xs rounded px-2.5 py-1.5 whitespace-nowrap shadow-lg">
                  File metadata saved. Re-upload to download.
                </div>
              )}
            </div>
          ))}
          <button onClick={() => fileRef.current?.click()} className="text-xs text-indigo-400 hover:text-indigo-700">+ Attach</button>
          <input ref={fileRef} type="file"
            accept=".jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.mp4,.mov,.avi,.zip,.tar,.gz"
            className="hidden" onChange={handleAttach} />
        </div>
      </td>
      <td className="px-3 py-2.5">
        <input value={assignee} onChange={e => setAssignee(e.target.value)} onBlur={() => persist({ assignee })}
          placeholder="Name"
          className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none bg-transparent" />
      </td>
      <td className="px-3 py-2.5">
        <input type="date" value={createdOn} onChange={e => setCreatedOn(e.target.value)} onBlur={() => persist({ createdOn })}
          className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none bg-transparent" />
      </td>
      <td className="px-3 py-2.5 text-xs text-slate-500 whitespace-nowrap">
        {exec.executedOn ? fmt(exec.executedOn) : <span className="text-slate-300">—</span>}
      </td>
    </tr>
  );
}

// ── Stat pill ─────────────────────────────────────────────
function Pill({ value, bg, text }) {
  if (!value) return <span className="text-slate-300 text-xs">—</span>;
  return (
    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold min-w-[28px]"
      style={{ backgroundColor: bg, color: text }}>
      {value}
    </span>
  );
}

// ── Test Execution ────────────────────────────────────────
export default function TestExecution({ testCases, testPlans, addToast }) {
  const [planIn,    setPlanIn]    = useState('');
  const [plan,      setPlan]      = useState(null);
  const [planErr,   setPlanErr]   = useState('');
  const [execData,  setExecData]  = useState({});
  const [planStats, setPlanStats] = useState({});
  const [page,      setPage]      = useState(1);
  const [loading,   setLoading]   = useState(false);
  const [histLoading, setHistLoading] = useState(true);

  const linked = useMemo(
    () => plan ? testCases.filter(tc => (plan.testCaseIds || []).includes(tc.id)) : [],
    [plan, testCases]
  );
  const paged = useMemo(() => linked.slice((page - 1) * PER_PAGE, page * PER_PAGE), [linked, page]);

  // Stats for the currently loaded plan
  const stats = useMemo(() => {
    const recs = Object.values(execData);
    return {
      total:     recs.filter(e => e.status).length,
      pass:      recs.filter(e => e.status === 'Pass').length,
      fail:      recs.filter(e => e.status === 'Fail').length,
      rerunPass: recs.filter(e => e.status === 'Rerun - Pass').length,
      rerunFail: recs.filter(e => e.status === 'Rerun - Fail').length,
    };
  }, [execData]);

  // Previously executed plans list — sorted newest ID first
  const executedPlans = useMemo(() => {
    return Object.keys(planStats)
      .map(id => ({
        id,
        ...(testPlans.find(p => p.id === id) || {}),
        s: planStats[id],
      }))
      .sort((a, b) => b.id.localeCompare(a.id));
  }, [planStats, testPlans]);

  const fetchExec = useCallback(async pid => {
    try { setExecData(await dbGetExecForPlan(pid)); } catch {}
  }, []);

  const refreshHistory = useCallback(async () => {
    try { setPlanStats(await dbGetAllExecGrouped()); } catch {}
    setHistLoading(false);
  }, []);

  // Load history on mount
  useEffect(() => { refreshHistory(); }, [refreshHistory]);

  const loadPlanById = useCallback(async (id) => {
    const upper = id.trim().toUpperCase();
    if (!upper) return;
    setPlanErr(''); setLoading(true);
    try {
      const { data } = await supabase.from('test_plans').select('*').eq('id', upper).single();
      if (!data) { setPlanErr('Test Plan not found'); setPlan(null); setLoading(false); return; }
      setPlan(tpFromDb(data));
      setPage(1);
      await fetchExec(upper);
      localStorage.setItem(LAST_PLAN_KEY, upper);
      refreshHistory();
    } catch { setPlanErr('Failed to load plan. Please try again.'); }
    setLoading(false);
  }, [fetchExec, refreshHistory]);

  // Restore last loaded plan on first render
  useEffect(() => {
    const saved = localStorage.getItem(LAST_PLAN_KEY);
    if (saved) { setPlanIn(saved); loadPlanById(saved); }
  }, [loadPlanById]);

  // Realtime subscription for current plan
  useEffect(() => {
    if (!plan || !supabase) return;
    const debRef = { current: null };
    const channel = supabase.channel(`exec_${plan.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'execution_records', filter: `plan_id=eq.${plan.id}` },
        () => { clearTimeout(debRef.current); debRef.current = setTimeout(() => { fetchExec(plan.id); refreshHistory(); }, 600); }
      ).subscribe();
    return () => { supabase.removeChannel(channel); clearTimeout(debRef.current); };
  }, [plan?.id, fetchExec, refreshHistory]);

  const loadPlan = () => loadPlanById(planIn);

  const ECOLS = ['Test Summary','Pre-requisite','Actions','Expected Results','Status','Bug ID','Artifacts','Assignee','Created On','Executed On'];
  const EW    = [185,135,135,135,125,105,155,115,110,130];

  const statCards = [
    { label: 'Total Executed', value: stats.total,     bg: '#f1f5f9', text: '#1e293b' },
    { label: 'Pass',           value: stats.pass,      bg: '#dcfce7', text: '#166534' },
    { label: 'Fail',           value: stats.fail,      bg: '#fee2e2', text: '#991b1b' },
    { label: 'Rerun Pass',     value: stats.rerunPass, bg: '#fef3c7', text: '#92400e' },
    { label: 'Rerun Fail',     value: stats.rerunFail, bg: '#fecaca', text: '#991b1b' },
  ];

  const fmtDate = iso => {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return iso; }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Test Execution</h1>

      {/* ── Plan ID input ── */}
      <div className="mb-6">
        <div className="flex gap-2 max-w-md">
          <Inp value={planIn}
            onChange={e => { setPlanIn(e.target.value); setPlanErr(''); }}
            placeholder="Enter Test Plan ID (e.g. TP-0001)"
            onKeyDown={e => e.key === 'Enter' && loadPlan()} />
          <Btn onClick={loadPlan} className="whitespace-nowrap">Load</Btn>
        </div>
        {planErr && <p className="text-red-500 text-xs mt-1.5">{planErr}</p>}
      </div>

      {/* ── Currently loaded plan ── */}
      {plan && (
        <div className="mb-8">
          {/* Plan details card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Test Plan</span>
                <h2 className="text-lg font-bold text-slate-800 mt-0.5">{plan.id}</h2>
                {plan.summary && <p className="text-sm text-slate-600 mt-0.5">{plan.summary}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-slate-400 bg-slate-50 border border-slate-200 px-2 py-1 rounded">
                  {linked.length} test case{linked.length !== 1 ? 's' : ''}
                </span>
                <button onClick={() => { setPlan(null); setPlanIn(''); localStorage.removeItem(LAST_PLAN_KEY); }}
                  className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded hover:bg-slate-100">
                  ✕ Close
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-3 border-t border-slate-100 pt-4">
              {[['Sprint', plan.sprint], ['Fix Version', plan.fixVersions], ['Release', plan.release], ['Component', plan.component]]
                .map(([k, v]) => v && (
                  <div key={k}>
                    <p className="text-xs text-slate-400">{k}</p>
                    <p className="text-sm font-medium text-slate-800 mt-0.5">{v}</p>
                  </div>
                ))}
              {(plan.labels || []).length > 0 && (
                <div>
                  <p className="text-xs text-slate-400 mb-1">Labels</p>
                  <div className="flex flex-wrap gap-1">
                    {plan.labels.map(l => <span key={l} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">{l}</span>)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Execution stats */}
          <div className="grid grid-cols-5 gap-3 mb-5">
            {statCards.map(c => (
              <div key={c.label} style={{ backgroundColor: c.bg }}
                className="rounded-xl px-4 py-3 flex flex-col items-center justify-center text-center border border-white/60">
                <p style={{ color: c.text }} className="text-2xl font-bold leading-none mb-1">{c.value}</p>
                <p style={{ color: c.text }} className="text-xs font-medium opacity-80">{c.label}</p>
              </div>
            ))}
          </div>

          {/* Execution table */}
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="spin" style={{ width: 32, height: 32, border: '4px solid #e0e7ff', borderTopColor: '#4f46e5', borderRadius: '50%' }} />
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table style={{ tableLayout: 'fixed', minWidth: '1430px', width: '100%' }} className="text-sm">
                  <colgroup>{EW.map((w, i) => <col key={i} style={{ width: w + 'px' }} />)}</colgroup>
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {ECOLS.map(h => <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paged.length === 0
                      ? <tr><td colSpan={10} className="text-center py-12 text-slate-400 text-sm">No test cases in this plan</td></tr>
                      : paged.map(tc => (
                        <ExecRow key={tc.id} tc={tc}
                          exec={execData[tc.id] || {}}
                          planId={plan.id}
                          onUpdate={(tcId, upd) => setExecData(p => ({ ...p, [tcId]: upd }))}
                        />
                      ))}
                  </tbody>
                </table>
              </div>
              <Pagination total={linked.length} page={page} perPage={PER_PAGE} onChange={setPage} />
            </div>
          )}
        </div>
      )}

      {/* ── Previously executed plans ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-700">Previously Executed Plans</h2>
          <button onClick={refreshHistory}
            className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100">
            ↻ Refresh
          </button>
        </div>

        {histLoading ? (
          <div className="flex justify-center py-10">
            <div className="spin" style={{ width: 24, height: 24, border: '3px solid #e0e7ff', borderTopColor: '#4f46e5', borderRadius: '50%' }} />
          </div>
        ) : executedPlans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-white rounded-xl border border-slate-200">
            <div className="text-4xl mb-3">▶️</div>
            <p className="text-sm font-medium text-slate-500">No plans have been executed yet</p>
            <p className="text-xs mt-1">Load a plan above and start setting execution statuses</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table style={{ tableLayout: 'fixed', minWidth: '980px', width: '100%' }} className="text-sm">
                <colgroup>
                  {[110, 200, 100, 120, 110, 90, 90, 90, 90, 110].map((w, i) => <col key={i} style={{ width: w + 'px' }} />)}
                </colgroup>
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {['Plan ID','Summary','Sprint','Component','Fix Version','Executed','Pass','Fail','Rerun Pass','Last Executed']
                      .map(h => <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {executedPlans.map(ep => {
                    const isActive = plan?.id === ep.id;
                    return (
                      <tr key={ep.id}
                        className={`hover:bg-slate-50 cursor-pointer ${isActive ? 'bg-indigo-50/70' : ''}`}
                        onClick={() => { setPlanIn(ep.id); loadPlanById(ep.id); }}>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-indigo-600">{ep.id}</span>
                            {isActive && <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">Active</span>}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-slate-700 text-xs truncate" title={ep.summary}>{ep.summary || <span className="text-slate-300">—</span>}</td>
                        <td className="px-3 py-3 text-slate-500 text-xs truncate">{ep.sprint || <span className="text-slate-300">—</span>}</td>
                        <td className="px-3 py-3 text-slate-500 text-xs truncate">{ep.component || <span className="text-slate-300">—</span>}</td>
                        <td className="px-3 py-3 text-slate-500 text-xs truncate">{ep.fixVersions || <span className="text-slate-300">—</span>}</td>
                        <td className="px-3 py-3">
                          <span className="text-xs font-medium text-slate-700">
                            {ep.s.total}
                            <span className="text-slate-400 font-normal"> / {ep.s.tcCount}</span>
                          </span>
                        </td>
                        <td className="px-3 py-3"><Pill value={ep.s.pass}      bg="#dcfce7" text="#166534" /></td>
                        <td className="px-3 py-3"><Pill value={ep.s.fail}      bg="#fee2e2" text="#991b1b" /></td>
                        <td className="px-3 py-3"><Pill value={ep.s.rerunPass} bg="#fef3c7" text="#92400e" /></td>
                        <td className="px-3 py-3 text-slate-400 text-xs whitespace-nowrap">{fmtDate(ep.s.lastExecuted)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
