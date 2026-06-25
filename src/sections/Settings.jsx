import { useTheme, FONT_SIZES } from '../lib/theme.jsx';

export default function Settings() {
  const { dark, toggle, fontSize, setFontSize } = useTheme();

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">Settings</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">Manage your display preferences</p>

      {/* ── Appearance ── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Appearance</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Customise how QA Compass looks on your screen</p>
        </div>

        {/* Theme */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Theme</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Switch between light and dark interface</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => dark && toggle()}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all
                  ${!dark
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                    : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500'}`}>
                <span>☀️</span> Light
              </button>
              <button
                onClick={() => !dark && toggle()}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all
                  ${dark
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                    : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500'}`}>
                <span>🌙</span> Dark
              </button>
            </div>
          </div>
        </div>

        {/* Font Size */}
        <div className="px-6 py-5">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Text Size</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Adjust text size across the entire application</p>
            </div>
            <div className="flex gap-2 shrink-0">
              {Object.entries(FONT_SIZES).map(([key, { label }]) => (
                <button
                  key={key}
                  onClick={() => setFontSize(key)}
                  className={`flex flex-col items-center justify-center w-20 py-3 rounded-xl border-2 transition-all
                    ${fontSize === key
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500'}`}>
                  <span className={`font-bold leading-none mb-1 ${key === 'sm' ? 'text-sm' : key === 'md' ? 'text-lg' : 'text-2xl'}`}>A</span>
                  <span className="text-xs">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── About ── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">About</h2>
        </div>
        <div className="px-6 py-5 space-y-3">
          {[
            ['Application', 'QA Compass'],
            ['Stack',       'React · Vite · Supabase · Tailwind CSS'],
            ['Features',    'Test Cases · Test Plans · Execution · Dashboard'],
            ['Storage',     'Supabase (PostgreSQL with Realtime)'],
          ].map(([label, value]) => (
            <div key={label} className="flex items-start gap-4">
              <span className="text-xs text-slate-500 dark:text-slate-400 w-24 shrink-0 pt-0.5">{label}</span>
              <span className="text-xs text-slate-800 dark:text-slate-100 font-medium">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
