import React, { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { fileService } from '../services/fileService';

interface Props {
  file: any;
  onClose: () => void;
}

type PreviewType = 'image' | 'pdf' | 'text' | 'video' | 'audio' | 'unsupported';

function getPreviewType(mimeType: string): PreviewType {
  if (!mimeType) return 'unsupported';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.startsWith('text/') || mimeType === 'application/json') return 'text';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'unsupported';
}

export default function FilePreviewModal({ file, onClose }: Props) {
  const { getToken } = useAuth();
  const [url, setUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const previewType = getPreviewType(file.mimeType || '');

  useEffect(() => {
    loadPreview();
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, []);

  const loadPreview = async () => {
    setLoading(true);
    setError(null);
    try {
    
      const { url: downloadUrl } = await fileService.downloadFile(file.id);

      if (previewType === 'text') {
        const res = await fetch(downloadUrl);
        const text = await res.text();
        setTextContent(text.slice(0, 50000)); // cap at 50k chars
      } else {
        setUrl(downloadUrl);
      }
    } catch {
      setError('Failed to load preview');
    } finally {
      setLoading(false);
    }
  };

  const fmtBytes = (b: number) => {
    if (b >= 1e6) return `${(b / 1e6).toFixed(1)} MB`;
    return `${(b / 1e3).toFixed(0)} KB`;
  };

  return (
    <div style={overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={container}>
        {/* Header */}
        <div style={header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <span style={{ fontSize: 20 }}>{mimeIcon(file.mimeType)}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 15, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {file.name}
              </div>
              <div style={{ fontSize: 12, color: '#475569' }}>
                {file.mimeType} · {fmtBytes(Number(file.sizeBytes || 0))}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {url && (
              <a
                href={url}
                download={file.name}
                style={{ padding: '6px 14px', background: '#0ea5e9', color: '#fff', borderRadius: 6, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}
              >
                ⬇ Download
              </a>
            )}
            <button onClick={onClose} style={closeBtn}>✕</button>
          </div>
        </div>

        {/* Preview area */}
        <div style={previewArea}>
          {loading && (
            <div style={centered}>
              <div style={spinnerStyle} />
              <span style={{ color: '#64748b', fontSize: 14, marginTop: 12 }}>Loading preview...</span>
            </div>
          )}

          {error && (
            <div style={centered}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
              <div style={{ color: '#ef4444', fontSize: 14 }}>{error}</div>
            </div>
          )}

          {!loading && !error && previewType === 'image' && url && (
            <img
              src={url}
              alt={file.name}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 6 }}
            />
          )}

          {!loading && !error && previewType === 'pdf' && url && (
            <iframe
              src={url}
              title={file.name}
              style={{ width: '100%', height: '100%', border: 'none', borderRadius: 6 }}
            />
          )}

          {!loading && !error && previewType === 'text' && textContent !== null && (
            <pre style={{
              margin: 0, padding: 20, color: '#cbd5e1', fontSize: 13,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              overflow: 'auto', width: '100%', height: '100%',
              boxSizing: 'border-box', background: 'transparent',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {textContent}
            </pre>
          )}

          {!loading && !error && previewType === 'video' && url && (
            <video controls style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 6 }}>
              <source src={url} type={file.mimeType} />
            </video>
          )}

          {!loading && !error && previewType === 'audio' && url && (
            <div style={centered}>
              <div style={{ fontSize: 64, marginBottom: 24 }}>🎵</div>
              <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: 16 }}>{file.name}</div>
              <audio controls style={{ width: 300 }}>
                <source src={url} type={file.mimeType} />
              </audio>
            </div>
          )}

          {!loading && !error && previewType === 'unsupported' && (
            <div style={centered}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>📎</div>
              <div style={{ color: '#94a3b8', fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
                Preview not available
              </div>
              <div style={{ color: '#475569', fontSize: 13, marginBottom: 20 }}>
                This file type cannot be previewed in the browser.
              </div>
              {url && (
                <a
                  href={url}
                  download={file.name}
                  style={{ padding: '10px 24px', background: '#6366f1', color: '#fff', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}
                >
                  Download to view
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function mimeIcon(mime: string) {
  if (!mime) return '📄';
  if (mime.startsWith('image/')) return '🖼️';
  if (mime.startsWith('video/')) return '🎬';
  if (mime.startsWith('audio/')) return '🎵';
  if (mime === 'application/pdf') return '📕';
  if (mime.startsWith('text/')) return '📝';
  return '📎';
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: 20,
};
const container: React.CSSProperties = {
  background: '#0f172a', borderRadius: 14, width: '90vw', height: '85vh',
  maxWidth: 1100, display: 'flex', flexDirection: 'column',
  border: '1px solid #1e293b', overflow: 'hidden',
};
const header: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '14px 20px', borderBottom: '1px solid #1e293b', flexShrink: 0,
};
const closeBtn: React.CSSProperties = {
  background: '#1e293b', border: 'none', color: '#94a3b8',
  cursor: 'pointer', fontSize: 16, width: 32, height: 32,
  borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const previewArea: React.CSSProperties = {
  flex: 1, overflow: 'hidden', display: 'flex',
  alignItems: 'center', justifyContent: 'center',
  background: '#080f1a',
};
const centered: React.CSSProperties = {
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
};
const spinnerStyle: React.CSSProperties = {
  width: 36, height: 36, border: '3px solid #1e293b',
  borderTopColor: '#6366f1', borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
};