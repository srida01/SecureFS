import React, { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import api from '../services/api';
import toast from 'react-hot-toast';

interface Props {
  onResultClick?: (item: any, type: 'file' | 'folder') => void;
  onClose: () => void;
}

const MIME_PRESETS = [
  { label: 'Any type', value: '' },
  { label: 'Images', value: 'image/' },
  { label: 'Videos', value: 'video/' },
  { label: 'Audio', value: 'audio/' },
  { label: 'PDFs', value: 'application/pdf' },
  { label: 'Documents', value: 'text/' },
  { label: 'Archives', value: 'application/zip' },
];

export default function AdvancedSearch({ onResultClick, onClose }: Props) {
  const { getToken } = useAuth();
  const [query, setQuery] = useState('');
  const [tags, setTags] = useState('');
  const [mimeType, setMimeType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minSize, setMinSize] = useState('');
  const [maxSize, setMaxSize] = useState('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!query.trim() && !tags.trim() && !mimeType && !dateFrom && !dateTo && !minSize && !maxSize) {
      toast.error('Enter at least a search term or filter');
      return;
    }
    setLoading(true);
    try {
      const token = await getToken();
      const params: any = {};
      if (query) params.q = query;
      if (mimeType) params.mimeType = mimeType;
      if (dateFrom) params.dateFrom = new Date(dateFrom).toISOString();
      if (dateTo) params.dateTo = new Date(dateTo).toISOString();
      if (tags.trim()) params.tags = tags;
      if (minSize) params.minSize = Number(minSize) * 1024; // KB to bytes
      if (maxSize) params.maxSize = Number(maxSize) * 1024;

      const res = await api.get('/search', {
        params,
        headers: { Authorization: `Bearer ${token}` },
      });
      setResults(res.data.data);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => {
    setQuery(''); setTags(''); setMimeType(''); setDateFrom('');
    setDateTo(''); setMinSize(''); setMaxSize('');
    setResults(null);
  };

  const fmtBytes = (b: number) => {
    if (b >= 1e6) return `${(b / 1e6).toFixed(1)} MB`;
    if (b >= 1e3) return `${(b / 1e3).toFixed(0)} KB`;
    return `${b} B`;
  };

  const totalResults = (results?.files?.length || 0) + (results?.folders?.length || 0);

  return (
    <div style={overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modal}>
        {/* Header */}
        <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' }}>Advanced Search</div>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Query */}
          <div>
            <label style={labelStyle}>Search query</label>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              placeholder="File or folder name..."
              style={inputStyle}
            />
          </div>

          {/* Filters row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>File type</label>
              <select value={mimeType} onChange={(e) => setMimeType(e.target.value)} style={inputStyle}>
                {MIME_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Tags</label>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Comma-separated tags"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Size range (KB)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="number"
                  value={minSize}
                  onChange={(e) => setMinSize(e.target.value)}
                  placeholder="Min"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <input
                  type="number"
                  value={maxSize}
                  onChange={(e) => setMaxSize(e.target.value)}
                  placeholder="Max"
                  style={{ ...inputStyle, flex: 1 }}
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>From date</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>To date</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={search} disabled={loading} style={primaryBtn}>
              {loading ? 'Searching...' : '🔍 Search'}
            </button>
            <button onClick={clearAll} style={secondaryBtn}>Clear</button>
          </div>
        </div>

        {/* Results */}
        {results !== null && (
          <div style={{ borderTop: '1px solid var(--border)', maxHeight: 360, overflow: 'auto' }}>
            <div style={{ padding: '12px 24px', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>
              {totalResults === 0 ? 'No results found' : `${totalResults} result${totalResults !== 1 ? 's' : ''}`}
            </div>

            {results.folders?.map((f: any) => (
              <div
                key={f.id}
                onClick={() => onResultClick?.(f, 'folder')}
                style={resultRow}
              >
                <span style={{ fontSize: 20 }}>📁</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-amber)' }}>{f.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Folder · {new Date(f.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
            ))}

            {results.files?.map((f: any) => (
              <div
                key={f.id}
                onClick={() => onResultClick?.(f, 'file')}
                style={resultRow}
              >
                <span style={{ fontSize: 20 }}>{getIcon(f.mimeType)}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{f.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    {f.mimeType || 'Unknown'} · {fmtBytes(Number(f.sizeBytes || 0))} · {new Date(f.createdAt).toLocaleDateString()}
                  </div>
                </div>
                {f.tags?.length > 0 && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    {f.tags.slice(0, 2).map((t: any) => (
                      <span key={t.id} style={tagChip}>{t.name}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getIcon(mime: string) {
  if (!mime) return '📄';
  if (mime.startsWith('image/')) return '🖼️';
  if (mime.startsWith('video/')) return '🎬';
  if (mime.startsWith('audio/')) return '🎵';
  if (mime === 'application/pdf') return '📕';
  if (mime.startsWith('text/')) return '📝';
  return '📎';
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
  display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
  paddingTop: 80, zIndex: 400,
};
const modal: React.CSSProperties = {
  background: 'var(--surface)', borderRadius: 14, width: 600, maxWidth: '95vw',
  border: '1px solid var(--border)', overflow: 'hidden',
  boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
};
const closeBtn: React.CSSProperties = {
  background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 18,
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6,
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', background: 'var(--bg-page)',
  border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 6,
  fontSize: 13, boxSizing: 'border-box',
};
const primaryBtn: React.CSSProperties = {
  flex: 1, padding: '10px 20px', background: 'var(--accent-purple)', color: 'var(--text-primary)',
  border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14,
};
const secondaryBtn: React.CSSProperties = {
  padding: '10px 20px', background: 'var(--border)', color: 'var(--text-secondary)',
  border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14,
};
const resultRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12,
  padding: '10px 24px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
  transition: 'background 0.1s',
};
const tagChip: React.CSSProperties = {
  fontSize: 10, background: 'var(--border)', color: 'var(--text-secondary)',
  padding: '2px 6px', borderRadius: 4, fontWeight: 600,
};
