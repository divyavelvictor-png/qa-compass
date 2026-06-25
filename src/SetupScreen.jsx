export default function SetupScreen() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 max-w-lg w-full">
        <div className="text-5xl text-center mb-4">⚙️</div>
        <h1 className="text-xl font-bold text-slate-800 text-center mb-2">Supabase Setup Required</h1>
        <p className="text-slate-500 text-sm text-center mb-6">
          Create a <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">.env</code> file
          in the project root and add your credentials.
        </p>

        <div className="bg-slate-900 rounded-xl p-4 text-xs font-mono space-y-2 mb-6">
          <p>
            <span className="text-slate-400"># .env</span>
          </p>
          <p>
            <span className="text-blue-300">VITE_SUPABASE_URL</span>
            <span className="text-slate-400">=</span>
            <span className="text-green-400">https://xxxx.supabase.co</span>
          </p>
          <p>
            <span className="text-blue-300">VITE_SUPABASE_ANON_KEY</span>
            <span className="text-slate-400">=</span>
            <span className="text-green-400">eyJ...</span>
          </p>
        </div>

        <ol className="space-y-3 text-sm text-slate-600">
          <li className="flex gap-3">
            <span className="w-5 h-5 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</span>
            <span>Go to <strong>supabase.com</strong> → your project → <strong>Settings → API</strong></span>
          </li>
          <li className="flex gap-3">
            <span className="w-5 h-5 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</span>
            <span>Copy the <strong>Project URL</strong> and <strong>anon public</strong> key into <code className="bg-slate-100 px-1 rounded text-xs">.env</code></span>
          </li>
          <li className="flex gap-3">
            <span className="w-5 h-5 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</span>
            <span>Run <code className="bg-slate-100 px-1 rounded text-xs">npm run dev</code> and refresh</span>
          </li>
          <li className="flex gap-3">
            <span className="w-5 h-5 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">4</span>
            <span>Make sure you ran <strong>schema.sql</strong> in the Supabase SQL Editor first</span>
          </li>
        </ol>
      </div>
    </div>
  );
}
