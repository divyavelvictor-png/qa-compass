import { useState, useMemo } from 'react';
import {
  PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer, Label,
} from 'recharts';
import { PRIORITIES, TC_TYPES, EXEC_STATUSES, CHART_COLORS, FALLBACK_CLR } from '../lib/constants';

function CenterLabel({ viewBox, total }) {
  if (!viewBox) return null;
  const { cx, cy } = viewBox;
  return (
    <g>
      <text x={cx} y={cy - 5} textAnchor="middle" fill="#1e293b" fontSize="22" fontWeight="700">{total}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="#94a3b8" fontSize="11">Total</text>
    </g>
  );
}

function FSel({ value, onChange, opts, empty }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="px-2 py-1 text-xs border border-slate-200 rounded bg-white focus:outline-none">
      <option value="">{empty}</option>
      {opts.map(o => <option key={o}>{o}</option>)}
    </select>
  );
}

export default function Dashboard({ testCases, testPlans, execRecords, lastRefreshed }) {
  const [fTC, setFTC] = useState(''); const [fTT, setFTT] = useState(''); const [fTP, setFTP] = useState('');
  const [fEF, setFEF] = useState(''); const [fER, setFER] = useState(''); const [fES, setFES] = useState('');

  const tcData = useMemo(() => {
    let d = [...testCases];
    if (fTC) d = d.filter(t => t.component === fTC);
    if (fTT) d = d.filter(t => t.type === fTT);
    if (fTP) d = d.filter(t => t.priority === fTP);
    const c = {};
    d.forEach(t => { const k = t.type || 'Unknown'; c[k] = (c[k] || 0) + 1; });
    return { slices: Object.entries(c).map(([name, value]) => ({ name, value })), total: d.length };
  }, [testCases, fTC, fTT, fTP]);

  const mpIds = useMemo(() => {
    if (!fEF && !fER && !fES) return null;
    return new Set(testPlans.filter(p =>
      (!fEF || p.fixVersions === fEF) &&
      (!fER || p.release    === fER) &&
      (!fES || p.sprint     === fES)
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

  const defects = useMemo(() => {
    const by = {};
    Object.values(execRecords).forEach(e => {
      if (e.bugId && e.planId) by[e.planId] = (by[e.planId] || 0) + 1;
    });
    return Object.entries(by).map(([planId, count]) => ({ planId, count })).sort((a, b) => b.count - a.count);
  }, [execRecords]);
  const totalBugs = defects.reduce((s, d) => s + d.count, 0);

  const comps   = useMemo(() => [...new Set(testCases.map(t => t.component).filter(Boolean))].sort(), [testCases]);
  const fvs     = useMemo(() => [...new Set(testPlans.map(p => p.fixVersions).filter(Boolean))].sort(), [testPlans]);
  const rels    = useMemo(() => [...new Set(testPlans.map(p => p.release).filter(Boolean))].sort(), [testPlans]);
  const sprints = useMemo(() => [...new Set(testPlans.map(p => p.sprint).filter(Boolean))].sort(), [testPlans]);

  const cards = [
    { l: 'Total Test Cases',  v: testCases.length, icon: '📋', c: 'text-indigo-600' },
    { l: 'Total Test Plans',  v: testPlans.length, icon: '📁', c: 'text-violet-600' },
    { l: 'Executions Logged', v: Object.values(execRecords).filter(e => e.status).length, icon: '▶️', c: 'text-emerald-600' },
    { l: 'Bugs Logged',       v: totalBugs, icon: '🐛', c: 'text-red-600' },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Real-time quality overview</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 bg-white border border-slate-200 px-3 py-1.5 rounded-lg">
          <span className="w-2 h-2 bg-green-500 rounded-full inline-block" />
          Live · {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 lg:grid-cols-4">
        {cards.map(c => (
          <div key={c.l} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{c.icon}</span>
              <div>
                <p className={`text-2xl font-bold ${c.c}`}>{c.v}</p>
                <p className="text-xs text-slate-500">{c.l}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-start justify-between mb-4 gap-3">
            <h2 className="text-sm font-semibold text-slate-800">Test Cases Overview</h2>
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
                  <Tooltip formatter={(v, n) => [v, n]} />
                  <Legend iconType="circle" iconSize={10} />
                </PieChart>
              </ResponsiveContainer>
            )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-start justify-between mb-4 gap-3">
            <h2 className="text-sm font-semibold text-slate-800">Execution Results</h2>
            <div className="flex flex-wrap gap-1.5">
              <FSel value={fEF} onChange={setFEF} opts={fvs}     empty="All Versions" />
              <FSel value={fER} onChange={setFER} opts={rels}     empty="All Releases" />
              <FSel value={fES} onChange={setFES} opts={sprints}  empty="All Sprints" />
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
                  <Tooltip />
                  <Legend iconType="circle" iconSize={10} />
                </PieChart>
              </ResponsiveContainer>
            )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-800">Defects Overview</h2>
            <span className="text-xs font-semibold text-white bg-red-500 px-2.5 py-1 rounded-full">{totalBugs} bugs total</span>
          </div>
          {defects.length === 0
            ? <div className="flex items-center justify-center py-10 text-slate-400 text-sm">No bugs logged yet</div>
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {['Plan', 'Summary', 'Bugs', 'Share'].map(h => (
                        <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {defects.map(({ planId, count }) => {
                      const plan = testPlans.find(p => p.id === planId);
                      const pct  = totalBugs ? Math.round((count / totalBugs) * 100) : 0;
                      return (
                        <tr key={planId} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono text-xs text-indigo-600 font-semibold">{planId}</td>
                          <td className="py-2.5 px-3 text-slate-600 text-xs truncate max-w-xs">{plan?.summary || '—'}</td>
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
    </div>
  );
}
