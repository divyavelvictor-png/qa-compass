import { useState, useEffect } from 'react';
import { ChipInput } from './ui';

export default function TagCell({ id, tags, onSave }) {
  const [edit, setEdit]   = useState(false);
  const [local, setLocal] = useState(tags);

  useEffect(() => setLocal(tags), [JSON.stringify(tags)]);

  if (!edit) {
    return (
      <div onClick={() => setEdit(true)} className="flex flex-wrap gap-1 min-h-5 cursor-pointer group">
        {tags.length
          ? tags.map(t => (
              <span key={t} className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs">{t}</span>
            ))
          : <span className="text-slate-300 text-xs group-hover:text-slate-400 italic">+ add tags</span>}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <ChipInput chips={local} onChange={setLocal} placeholder="Tag…" />
      <div className="flex gap-1 mt-1">
        <button
          onClick={() => { onSave(id, local); setEdit(false); }}
          className="px-2 py-0.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700">
          ✓
        </button>
        <button
          onClick={() => { setLocal(tags); setEdit(false); }}
          className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded">
          ✕
        </button>
      </div>
    </div>
  );
}
