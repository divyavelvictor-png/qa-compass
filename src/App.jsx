import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, IS_CONFIGURED } from './lib/supabase';
import { dbGetTCs, dbGetTPs, dbGetAllExec } from './lib/db';
import { ThemeProvider, useTheme, FONT_SIZES } from './lib/theme.jsx';
import { ToastStack } from './components/ui';
import TestCaseRepository from './sections/TestCaseRepository';
import TestPlan           from './sections/TestPlan';
import TestExecution      from './sections/TestExecution';
import Dashboard          from './sections/Dashboard';
import Settings           from './sections/Settings';
import SetupScreen        from './SetupScreen';

// Professional compass icon — always visible in both expanded and collapsed sidebar
function AppIcon({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Background */}
      <circle cx="18" cy="18" r="17" fill="#4f46e5"/>
      <circle cx="18" cy="18" r="17" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1"/>
      {/* Inner ring */}
      <circle cx="18" cy="18" r="11.5" fill="none" stroke="rgba(255,255,255,0.13)" strokeWidth="0.8"/>
      {/* Cardinal ticks */}
      <line x1="18" y1="2.5" x2="18" y2="6.5"  stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="18" y1="29.5" x2="18" y2="33.5" stroke="rgba(255,255,255,0.25)" strokeWidth="1"   strokeLinecap="round"/>
      <line x1="2.5" y1="18" x2="6.5" y2="18"   stroke="rgba(255,255,255,0.25)" strokeWidth="1"   strokeLinecap="round"/>
      <line x1="29.5" y1="18" x2="33.5" y2="18" stroke="rgba(255,255,255,0.25)" strokeWidth="1"   strokeLinecap="round"/>
      {/* North needle — white */}
      <path d="M18 7.5 L15.5 18 L18 16.5 L20.5 18 Z" fill="white"/>
      {/* South needle — dim */}
      <path d="M18 28.5 L20.5 18 L18 19.5 L15.5 18 Z" fill="rgba(255,255,255,0.32)"/>
      {/* Centre jewel */}
      <circle cx="18" cy="18" r="2.8" fill="white"/>
      <circle cx="18" cy="18" r="1.6" fill="#4f46e5"/>
    </svg>
  );
}

let _toastId = 0;

const NAV = [
  { id: 'repository', label: 'Test Case Repository', icon: '📋' },
  { id: 'testplan',   label: 'Test Plan',             icon: '📁' },
  { id: 'execution',  label: 'Test Execution',         icon: '▶️' },
  { id: 'dashboard',  label: 'Dashboard',              icon: '📊' },
  { id: 'settings',   label: 'Settings',               icon: '⚙️' },
];

function ConfigGate({ children }) {
  return IS_CONFIGURED ? children : <SetupScreen />;
}

function AppShell() {
  const { dark } = useTheme();
  const [section, setSection]     = useState('repository');
  const [collapsed, setCollapsed] = useState(false);
  const [toasts, setToasts]       = useState([]);
  const [testCases, setTestCases] = useState([]);
  const [testPlans, setTestPlans] = useState([]);
  const [execRecords, setExecRecords] = useState({});
  const [loading, setLoading]     = useState(true);
  const [dbErr, setDbErr]         = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const timers = useRef({});

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

  const loadData = useCallback(async () => {
    try {
      const [tcs, tps, exs] = await Promise.all([dbGetTCs(), dbGetTPs(), dbGetAllExec()]);
      setTestCases(tcs); setTestPlans(tps); setExecRecords(exs);
      setLastRefreshed(new Date()); setDbErr(null);
    } catch (e) {
      const m = e?.message || '';
      if (m.includes('fetch') || m.includes('Failed') || m.includes('network'))
        setDbErr('Connection failed. Check your Supabase URL and key in .env');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const channel = supabase.channel('qa_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'test_cases' },        loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'test_plans' },         loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'execution_records' },  loadData)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [loadData]);

  if (dbErr) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-red-200 dark:border-red-900 shadow-sm p-8 max-w-md w-full text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Connection Error</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">{dbErr}</p>
        <button onClick={() => { setDbErr(null); setLoading(true); loadData(); }}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
          Retry
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">

      {/* ── Sidebar ── */}
      <aside style={{ transition: 'width 0.2s', width: collapsed ? 64 : 256 }}
        className="fixed left-0 top-0 h-full bg-slate-900 z-40 flex flex-col shadow-2xl shrink-0">

        {/* Logo + collapse */}
        <div className={`border-b border-white/[0.08] shrink-0 ${
          collapsed
            ? 'flex flex-col items-center pt-3 pb-2 gap-2 px-2'
            : 'flex items-center h-16 px-4 gap-3'
        }`}>
          {/* Icon — always visible */}
          <AppIcon size={collapsed ? 30 : 34} />

          {/* Name — only when expanded */}
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm tracking-wide truncate">QA Compass</p>
              <p className="text-slate-500 text-xs">Supabase · Live</p>
            </div>
          )}

          {/* Collapse toggle */}
          <button onClick={() => setCollapsed(c => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-700/50 shrink-0 text-sm focus-visible:ring-2 focus-visible:ring-indigo-400">
            {collapsed ? '→' : '←'}
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-2 overflow-hidden" role="navigation" aria-label="Main navigation">
          {NAV.map(item => (
            <button key={item.id} onClick={() => setSection(item.id)}
              title={collapsed ? item.label : undefined}
              aria-current={section === item.id ? 'page' : undefined}
              className={`w-full flex items-center py-3 text-sm transition-all focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400 ${
                collapsed ? 'justify-center px-2 gap-0' : 'px-4 gap-3'
              } ${section === item.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <span className="text-base shrink-0" aria-hidden="true">{item.icon}</span>
              {!collapsed && <span className="font-medium truncate">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Footer — status only */}
        <div className="border-t border-white/[0.08] shrink-0 px-4 py-3 flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full shrink-0" />
          {!collapsed && <p className="text-xs text-slate-500 truncate">Real-time sync enabled</p>}
        </div>
      </aside>

      {/* ── Main content ── */}
      <main style={{ marginLeft: collapsed ? 64 : 256, transition: 'margin-left 0.2s' }}
        className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950" id="main-content">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="spin" style={{ width: 40, height: 40, border: '4px solid #e0e7ff', borderTopColor: '#4f46e5', borderRadius: '50%' }} />
            <p className="text-slate-500 dark:text-slate-400 text-sm">Connecting to Supabase…</p>
          </div>
        ) : (
          <>
            {section === 'repository' && <TestCaseRepository testCases={testCases} testPlans={testPlans} loadData={loadData} addToast={addToast} />}
            {section === 'testplan'   && <TestPlan testCases={testCases} testPlans={testPlans} loadData={loadData} addToast={addToast} />}
            {section === 'execution'  && <TestExecution testCases={testCases} testPlans={testPlans} addToast={addToast} />}
            {section === 'dashboard'  && <Dashboard testCases={testCases} testPlans={testPlans} execRecords={execRecords} lastRefreshed={lastRefreshed} />}
            {section === 'settings'   && <Settings />}
          </>
        )}
      </main>

      <ToastStack toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ConfigGate><AppShell /></ConfigGate>
    </ThemeProvider>
  );
}
