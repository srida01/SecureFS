import React, { useState } from 'react';
import { fileService } from '../services/fileService';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const search = async (q: string) => {
    if (!q.trim()) { setResults(null); return; }
    setLoading(true);
    const data = await fileService.searchFiles(q);
    setResults(data);
    setLoading(false);
  };

  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); search(e.target.value); }}
        placeholder="🔍  Search files and folders..."
        style={{ width: '100%', padding: '8px 16px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 8, fontSize: 14 }}
      />
      {results && (
        <div style={{ position: 'absolute', top: '110%', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, zIndex: 50, maxHeight: 300, overflow: 'auto', padding: 12 }}>
          {results.files?.length === 0 && results.folders?.length === 0 && <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>No results found</div>}
          {results.folders?.map((f: any) => (
            <div key={f.id} style={{ padding: '6px 8px', fontSize: 13, color: 'var(--accent-teal)', cursor: 'pointer' }}>📁 {f.name}</div>
          ))}
          {results.files?.map((f: any) => (
            <div key={f.id} style={{ padding: '6px 8px', fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer' }}>📄 {f.name}</div>
          ))}
          <button onClick={() => { setQuery(''); setResults(null); }} style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>✕</button>
        </div>
      )}
    </div>
  );
}