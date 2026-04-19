import React, { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import api from '../services/api';

interface Props {
  file: any;
  onClose: () => void;
}

export default function VersionHistoryModal({ file, onClose }: Props) {
  const { getToken } = useAuth();
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => {
    loadVersions();
  }, []);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await api.get(`/files/${file.id}/versions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVersions(res.data.data || []);
    } catch {
      toast.error('Failed to load version history');
    } finally {
      setLoading(false);
    }
  };

  const restoreVersion = async (versionId: string) => {
    setRestoring(versionId);
    try {
      const token = await getToken();
      await api.post(
        `/files/${file.id}/versions/${versionId}/restore`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Version restored successfully');
      onClose();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Restore failed');
    } finally {
      setRestoring(null);
    }
  };

  const downloadVersion = async (versionId: string, versionNum: number) => {
    try {
      const token = await getToken();
      const res = await api.get(`/files/${file.id}/versions/${versionId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const a = document.createElement('a');
      a.href = res.data.data.url;
      a.download = `${file.name}_v${versionNum}`;
      a.click();
    } catch {
      toast.error('Download failed');
    }
  };

  const fmtBytes = (b: number) => {
    if (b >= 1e6) return `${(b / 1e6).toFixed(1)} MB`;
    return `${(b / 1e3).toFixed(0)} KB`;
  };

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={header}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: '#e2e8f0' }}>
              Version History
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{file.name}</div>
          </div>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        {loading ? (
          <div style={emptyState}>
            <div style={spinner} />
            <span style={{ color: '#64748b', fontSize: 14 }}>Loading versions...</span>
          </div>
        ) : versions.length === 0 ? (
          <div style={emptyState}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div style={{ color: '#64748b', fontSize: 14 }}>No previous versions found</div>
          </div>
        ) : (
          <div style={{ overflow: 'auto', maxHeight: 420 }}>
            {versions.map((v, i) => (
              <div
                key={v.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '14px 20px',
                  borderBottom: '1px solid #1e293b',
                  background: i === 0 ? '#0f2027' : 'transparent',
                }}
              >
                {/* Version badge */}
                <div
                  style={{
                    minWidth: 40,
                    height: 40,
                    borderRadius: 8,
                    background: i === 0 ? '#6366f1' : '#334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 13,
                    color: '#fff',
                  }}
                >
                  v{v.versionNumber || versions.length - i}
                </div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>
                      {i === 0 ? 'Current version' : `Version ${v.versionNumber || versions.length - i}`}
                    </span>
                    {i === 0 && (
                      <span style={{ fontSize: 10, background: '#6366f120', color: '#818cf8', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                        LATEST
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                    {new Date(v.createdAt).toLocaleString()} · {fmtBytes(Number(v.sizeBytes || 0))}
                    {v.checksum && (
                      <span style={{ marginLeft: 8, fontFamily: 'monospace', color: '#334155' }}>
                        {v.checksum.slice(0, 8)}…
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => downloadVersion(v.id, v.versionNumber || versions.length - i)}
                    style={actionBtn('#0f172a', '#94a3b8')}
                  >
                    ⬇ Download
                  </button>
                  {i > 0 && (
                    <button
                      onClick={() => restoreVersion(v.id)}
                      disabled={restoring === v.id}
                      style={actionBtn('#6366f120', '#818cf8')}
                    >
                      {restoring === v.id ? '...' : '↩ Restore'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ padding: '16px 20px', borderTop: '1px solid #1e293b', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 20px', background: '#334155', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400,
};
const modal: React.CSSProperties = {
  background: '#1e293b', borderRadius: 14, width: 600, maxWidth: '95vw',
  border: '1px solid #334155', overflow: 'hidden',
};
const header: React.CSSProperties = {
  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
  padding: '20px 20px 16px', borderBottom: '1px solid #334155',
};
const closeBtn: React.CSSProperties = {
  background: 'none', border: 'none', color: '#64748b',
  cursor: 'pointer', fontSize: 18, lineHeight: 1,
};
const emptyState: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  justifyContent: 'center', padding: 48,
};
const spinner: React.CSSProperties = {
  width: 28, height: 28, border: '3px solid #334155',
  borderTopColor: '#6366f1', borderRadius: '50%',
  animation: 'spin 0.8s linear infinite', marginBottom: 12,
};
function actionBtn(bg: string, color: string): React.CSSProperties {
  return {
    padding: '6px 12px', background: bg, color, border: `1px solid ${color}30`,
    borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600,
  };
}
