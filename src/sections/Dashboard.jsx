import { useState, useMemo } from 'react';
import {
  PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer, Label,
} from 'recharts';
import { PRIORITIES, TC_TYPES, EXEC_STATUSES, CHART_COLORS, FALLBACK_CLR } from '../lib/constants';
import { useTheme } from '../lib/theme';

// Display-layer normalization — handles dirty data already in the DB
const dTrim = s => (s || '').toString().trim();
const dCap  = s => { const t = dTrim(s); return t ? t.charAt(0).toUpperCase() + t.slice(1) : ''; };
const dNorm = (s, list) => { const t = dTrim(s); return list.find(x => x.toLowerCase() === t.toLowerCase()) || t; };

function ChartTooltip({ dark }) {
  return {
    contentStyle: {
      backgroundColor: dark ? '#1e293b' : '#fff',
      borderColor:     dark ? '#334155' : '#e2e8f0',
      borderRadius:    8,
      color:           dark ? '#f1f5f9' : '#0f172a',
      fontSize:        12,
    },
    itemStyle: { color: dark ? '#cbd5e1' : '#475569' },
  };
}

function CenterLabel({ viewBox, total }) {
  const { dark } = useTheme();
  if (!viewBox) return null;
  const { cx, cy } = viewBox;
  return (
    <g>
      <text x={cx} y={cy - 5} textAnchor="middle" fill={dark ? '#f1f5f9' : '#1e293b'} fontSize="22" fontWeight="700">{total}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill={dark ? '#94a3b8' : '#94a3b8'} fontSize="11">Total</text>
    </g>
  );
}

function FSel({ value, onChange, opts, empty }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="px-2 py-1 text-xs border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
      <option value="">{empty}</option>
      {opts.map(o => <option key={o}>{o}</option>)}
    </select>
  );
}

export default function Dashboard({ testCases, testPlans, execRecords, lastRefreshed }) {
  const { dark } = useTheme();
  const tt = ChartTooltip({ dark });
  const legendFmt = v => <span style={{ color: dark ? '#cbd5e1' : '#475569', fontSize: 11 }}>{v}</span>;
  const [fTC, setFTC] = useState(''); const [fTT, setFTT] = useState(''); const [fTP, setFTP] = useState('');
  const [fEF, setFEF] = useState(''); const [fER, setFER] = useState(''); const [fES, setFES] = useState('');

  // ── Test Cases by Type ──────────────────────────────────
  const tcData = useMemo(() => {
    let d = [...testCases];
    if (fTC) d = d.filter(t => dCap(t.component) === fTC);
    if (fTT) d = d.filter(t => dNorm(t.type, TC_TYPES) === fTT);
    if (fTP) d = d.filter(t => dNorm(t.priority, PRIORITIES) === fTP);
    const c = {};
    d.forEach(t => {
      const k = dNorm(t.type, TC_TYPES) || 'Unknown';
      c[k] = (c[k] || 0) + 1;
    });
    return { slices: Object.entries(c).map(([name, value]) => ({ name, value })), total: d.length };
  }, [testCases, fTC, fTT, fTP]);

  // ── Test Cases not linked to any plan ───────────────────
  const tcNotInPlan = useMemo(() => {
    const linked = new Set(testPlans.flatMap(p => p.testCaseIds || []));
    return testCases.filter(tc => !linked.has(tc.id)).length;
  }, [testCases, testPlans]);

  // ── Test Plan Status (Not Started / In Progress / Completed) ──
  const tpStatusData = useMemo(() => {
    let notStarted = 0, inProgress = 0, completed = 0;

    testPlans.forEach(plan => {
      const tcIds = plan.testCaseIds || [];
      if (tcIds.length === 0) { notStarted++; return; }

      const executedSet = new Set(
        Object.values(execRecords)
          .filter(e => e.planId === plan.id && e.status)
          .map(e => e.tcId)
      );

      if (executedSet.size === 0)             notStarted++;
      else if (executedSet.size >= tcIds.length) completed++;
      else                                    inProgress++;
    });

    const slices = [
      { name: 'Not Started', value: notStarted },
      { name: 'In Progress', value: inProgress },
      { name: 'Completed',   value: completed  },
    ].filter(d => d.value > 0);

    return { slices, total: testPlans.length, notStarted, inProgress, completed };
  }, [testPlans, execRecords]);

  // ── Execution Results pie ───────────────────────────────
  const mpIds = useMemo(() => {
    if (!fEF && !fER && !fES) return null;
    return new Set(testPlans.filter(p =>
      (!fEF || dTrim(p.fixVersions) === fEF) &&
      (!fER || dTrim(p.release)     === fER) &&
      (!fES || dTrim(p.sprint)      === fES)
    ).map(p => p.id));
  }, [testPlans, fEF, fER, fES]);

  const exData = useMemo(() => {
    let r = Object.values(execRecords).filter(e => e.status);
    if (mpIds) r = r.filter(e => mpIds.has(e.planId));
    const c = {};
    r.forEach(e => { c[e.status] = (c[e.status] || 0) + 1; });
    return {
      slices: EXEC_STATUSES.map(s => ({ name: s, value: c[s] || 0 })).filter(d => d.value > 0),
      total: r.length,
    };
  }, [execRecords, mpIds]);

  // ── Defects ─────────────────────────────────────────────
  const defects = useMemo(() => {
    const by = {};
    Object.values(execRecords).forEach(e => {
      if (e.bugId && e.planId) by[e.planId] = (by[e.planId] || 0) + 1;
    });
    return Object.entries(by).map(([planId, count]) => ({ planId, count })).sort((a, b) => b.count - a.count);
  }, [execRecords]);
  const totalBugs = defects.reduce((s, d) => s + d.count, 0);

  const comps   = useMemo(() => [...new Set(testCases.map(t => dCap(t.component)).filter(Boolean))].sort(), [testCases]);
  const fvs     = useMemo(() => [...new Set(testPlans.map(p => dTrim(p.fixVersions)).filter(Boolean))].sort(), [testPlans]);
  const rels    = useMemo(() => [...new Set(testPlans.map(p => dTrim(p.release)).filter(Boolean))].sort(), [testPlans]);
  const sprints = useMemo(() => [...new Set(testPlans.map(p => dTrim(p.sprint)).filter(Boolean))].sort(), [testPlans]);

  const cards = [
    { l: 'Total Test Cases',    v: testCases.length,  icon: '📋', c: 'text-indigo-600 dark:text-indigo-400'  },
    { l: 'Total Test Plans',    v: testPlans.length,  icon: '📁', c: 'text-violet-600 dark:text-violet-400'  },
    { l: 'Executions Logged',   v: Object.values(execRecords).filter(e => e.status).length, icon: '▶️', c: 'text-emerald-600 dark:text-emerald-400' },
    { l: 'Bugs Logged',         v: totalBugs,         icon: '🐛', c: 'text-red-600 dark:text-red-400'        },
    { l: 'TCs Not in Any Plan', v: tcNotInPlan,       icon: '🔗', c: 'text-orange-500 dark:text-orange-400'  },
  ];

  return (
    <div className="p-6 dark:text-slate-100">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Real-time quality overview</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 bg-white border border-slate-200 px-3 py-1.5 rounded-lg">
          <span className="w-2 h-2 bg-green-500 rounded-full inline-block" />
          Live · {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-4 mb-6 md:grid-cols-3 lg:grid-cols-5">
        {cards.map(c => (
          <div key={c.l} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{c.icon}</span>
              <div>
                <p className={`text-2xl font-bold ${c.c}`}>{c.v}</p>
                <p className="text-xs text-slate-700 dark:text-slate-200 leading-tight mt-0.5">{c.l}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-3">

        {/* Test Cases by Type */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-start justify-between mb-4 gap-2 flex-wrap">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Test Cases Overview</h2>
            <div className="flex flex-wrap gap-1.5">
              <FSel value={fTC} onChange={setFTC} opts={comps}     empty="All Components" />
              <FSel value={fTT} onChange={setFTT} opts={TC_TYPES}  empty="All Types" />
              <FSel value={fTP} onChange={setFTP} opts={PRIORITIES} empty="All Priorities" />
            </div>
          </div>
          {tcData.slices.length === 0
            ? <div className="flex items-center justify-center h-60 text-slate-400 text-sm">No data to display</div>
            : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={tcData.slices} cx="50%" cy="50%" innerRadius={68} outerRadius={100} dataKey="value" paddingAngle={2}>
                    {tcData.slices.map((e, i) => <Cell key={i} fill={CHART_COLORS[e.name] || FALLBACK_CLR[i % FALLBACK_CLR.length]} />)}
                    <Label content={props => <CenterLabel {...props} total={tcData.total} />} position="center" />
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} contentStyle={tt.contentStyle} itemStyle={tt.itemStyle} />
                  <Legend iconType="circle" iconSize={10} formatter={legendFmt} />
                </PieChart>
              </ResponsiveContainer>
            )}
        </div>

        {/* Test Plan Status */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-start justify-between mb-4 gap-2">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Test Plan Status</h2>
          </div>

          {/* Status summary pills */}
          <div className="flex gap-3 mb-3">
            {[
              { label: 'Not Started', value: tpStatusData.notStarted, bg: '#f1f5f9', text: '#64748b' },
              { label: 'In Progress', value: tpStatusData.inProgress, bg: '#fef3c7', text: '#92400e' },
              { label: 'Completed',   value: tpStatusData.completed,  bg: '#dcfce7', text: '#166534' },
            ].map(s => (
              <div key={s.label} style={{ backgroundColor: s.bg }}
                className="flex-1 rounded-lg px-2 py-2 text-center">
                <p style={{ color: s.text }} className="text-lg font-bold leading-none">{s.value}</p>
                <p style={{ color: s.text }} className="text-xs font-medium mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {tpStatusData.slices.length === 0
            ? <div className="flex items-center justify-center h-44 text-slate-400 text-sm">No test plans yet</div>
            : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={tpStatusData.slices} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={2}>
                    {tpStatusData.slices.map((e, i) => <Cell key={i} fill={CHART_COLORS[e.name] || FALLBACK_CLR[i % FALLBACK_CLR.length]} />)}
                    <Label content={props => <CenterLabel {...props} total={tpStatusData.total} />} position="center" />
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} contentStyle={tt.contentStyle} itemStyle={tt.itemStyle} />
                  <Legend iconType="circle" iconSize={10} formatter={legendFmt} />
                </PieChart>
              </ResponsiveContainer>
            )}
        </div>

        {/* Execution Results */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-start justify-between mb-4 gap-2 flex-wrap">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Execution Results</h2>
            <div className="flex flex-wrap gap-1.5">
              <FSel value={fEF} onChange={setFEF} opts={fvs}    empty="All Versions" />
              <FSel value={fER} onChange={setFER} opts={rels}    empty="All Releases" />
              <FSel value={fES} onChange={setFES} opts={sprints} empty="All Sprints" />
            </div>
          </div>
          {exData.slices.length === 0
            ? <div className="flex items-center justify-center h-60 text-slate-400 text-sm">No execution data yet</div>
            : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={exData.slices} cx="50%" cy="50%" innerRadius={68} outerRadius={100} dataKey="value" paddingAngle={2}>
                    {exData.slices.map((e, i) => <Cell key={i} fill={CHART_COLORS[e.name] || FALLBACK_CLR[i % FALLBACK_CLR.length]} />)}
                    <Label content={props => <CenterLabel {...props} total={exData.total} />} position="center" />
                  </Pie>
                  <Tooltip contentStyle={tt.contentStyle} itemStyle={tt.itemStyle} />
                  <Legend iconType="circle" iconSize={10} formatter={legendFmt} />
                </PieChart>
              </ResponsiveContainer>
            )}
        </div>
      </div>

      {/* ── Defects table ── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Defects Overview</h2>
          <span className="text-xs font-semibold text-white bg-red-500 px-2.5 py-1 rounded-full">{totalBugs} bugs total</span>
        </div>
        {defects.length === 0
          ? <div className="flex items-center justify-center py-10 text-slate-400 text-sm">No bugs logged yet</div>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700">
                    {['Plan', 'Summary', 'Bugs', 'Share'].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                  {defects.map(({ planId, count }) => {
                    const plan = testPlans.find(p => p.id === planId);
                    const pct  = totalBugs ? Math.round((count / totalBugs) * 100) : 0;
                    return (
                      <tr key={planId} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                        <td className="py-2.5 px-3 font-mono text-xs text-indigo-600 dark:text-indigo-400 font-semibold">{planId}</td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 text-xs truncate max-w-xs">{plan?.summary || '—'}</td>
                        <td className="py-2.5 px-3 text-sm font-bold text-slate-800">{count}</td>
                        <td className="py-2.5 px-3 w-56">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-100 rounded-full h-2">
                              <div className="bg-red-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-slate-400 w-9 text-right">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </div>
  );
}
