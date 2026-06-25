import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, IS_CONFIGURED } from './lib/supabase';
import { dbGetTCs, dbGetTPs, dbGetAllExec } from './lib/db';
import { ToastStack } from './components/ui';
import TestCaseRepository from './sections/TestCaseRepository';
import TestPlan           from './sections/TestPlan';
import TestExecution      from './sections/TestExecution';
import Dashboard          from './sections/Dashboard';
import SetupScreen        from './SetupScreen';

let _toastId = 0;

const NAV = [
  { id: 'repository', label: 'Test Case Repository', icon: '📋' },
  { id: 'testplan',   label: 'Test Plan',             icon: '📁' },
  { id: 'execution',  label: 'Test Execution',         icon: '▶️' },
  { id: 'dashboard',  label: 'Dashboard',              icon: '📊' },
];

// Shown when .env is not configured
function ConfigGate({ children }) {
  return IS_CONFIGURED ? children : <SetupScreen />;
}

// Main app shell (only rendered when configured)
function AppShell() {
  const [section, setSection] = useState('repository');
  const [collapsed, setCollapsed] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [testCases, setTestCases] = useState([]);
  const [testPlans, setTestPlans] = useState([]);
  const [execRecords, setExecRecords] = useState({});
  const [loading, setLoading] = useState(true);
  const [dbErr, setDbErr]     = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const timers = useRef({});

  // ── Toasts ──
  const removeToast = useCallback(id => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts(ts => ts.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'success') => {
    const id = ++_toastId;
    setToasts(ts => [...ts, { id, message, type }]);
    timers.current[id] = setTimeout(() => removeToast(id), 5000);
  }, [removeToast]);

  // ── Load all data ──
  const loadData = useCallback(async () => {
    try {
      const [tcs, tps, exs] = await Promise.all([
        dbGetTCs(), dbGetTPs(), dbGetAllExec(),
      ]);
      setTestCases(tcs);
      setTestPlans(tps);
      setExecRecords(exs);
      setLastRefreshed(new Date());
      setDbErr(null);
    } catch (e) {
      const m = e?.message || '';
      if (m.includes('fetch') || m.includes('Failed') || m.includes('network')) {
        setDbErr('Connection failed. Check your Supabase URL and key in .env');
      }
    }
    setLoading(false);
  }, []);

  // ── Initial load + Realtime subscriptions ──
  useEffect(() => {
    loadData();
    const channel = supabase
      .channel('qa_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'test_cases' },        loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'test_plans' },         loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'execution_records' },  loadData)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [loadData]);

  // ── Connection error screen ──
  if (dbErr) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white rounded-xl border border-red-200 shadow-sm p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">Connection Error</h2>
          <p className="text-slate-500 text-sm mb-4">{dbErr}</p>
          <button
            onClick={() => { setDbErr(null); setLoading(true); loadData(); }}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">

      {/* ── Sidebar ── */}
      <aside
        style={{ transition: 'width 0.2s', width: collapsed ? 64 : 256 }}
        className="fixed left-0 top-0 h-full bg-slate-900 z-40 flex flex-col shadow-2xl shrink-0">

        {/* Logo + toggle */}
        <div
          className="flex items-center h-16 border-b border-white/[0.08] shrink-0"
          style={{ padding: collapsed ? '0 8px' : '0 16px', gap: 12 }}>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm tracking-wide truncate">QA Compass</p>
              <p className="text-slate-500 text-xs">Supabase · Live</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors shrink-0 text-sm">
            {collapsed ? '→' : '←'}
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-2 overflow-hidden">
          {NAV.map(item => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center py-3 text-sm transition-all ${
                collapsed ? 'justify-center px-2 gap-0' : 'px-4 gap-3'
              } ${section === item.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}>
              <span className="text-base shrink-0">{item.icon}</span>
              {!collapsed && <span className="font-medium truncate">{item.label}</span>}
            </button>
          ))}
        </nav>

        {!collapsed && (
          <div className="px-4 py-3 border-t border-white/[0.08] shrink-0">
            <p className="text-xs text-slate-600">Real-time sync enabled</p>
          </div>
        )}
      </aside>

      {/* ── Main content ── */}
      <main
        style={{ marginLeft: collapsed ? 64 : 256, transition: 'margin-left 0.2s' }}
        className="flex-1 overflow-auto">

        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="spin" style={{ width: 40, height: 40, border: '4px solid #e0e7ff', borderTopColor: '#4f46e5', borderRadius: '50%' }} />
            <p className="text-slate-500 text-sm">Connecting to Supabase…</p>
          </div>
        ) : (
          <>
            {section === 'repository' && (
              <TestCaseRepository testCases={testCases} loadData={loadData} addToast={addToast} />
            )}
            {section === 'testplan' && (
              <TestPlan testCases={testCases} testPlans={testPlans} loadData={loadData} addToast={addToast} />
            )}
            {section === 'execution' && (
              <TestExecution testCases={testCases} testPlans={testPlans} addToast={addToast} />
            )}
            {section === 'dashboard' && (
              <Dashboard testCases={testCases} testPlans={testPlans} execRecords={execRecords} lastRefreshed={lastRefreshed} />
            )}
          </>
        )}
      </main>

      <ToastStack toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export default function App() {
  return (
    <ConfigGate>
      <AppShell />
    </ConfigGate>
  );
}
