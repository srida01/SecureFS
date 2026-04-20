import React, { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import FilePreviewModal from '../components/FilePreviewModal.tsx';

export default function SharedWithMe() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [sharedItems, setSharedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'file' | 'folder'>('all');

  useEffect(() => {
    loadShared();
  }, []);

  const loadShared = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await api.get('/permissions/shared-with-me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSharedItems(res.data.data || []);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to load shared items');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (file: any) => {
    try {
      const token = await getToken();
      const res = await api.get(`/files/${file.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const a = document.createElement('a');
      a.href = res.data.data.url;
      a.download = file.name;
      a.click();
    } catch {
      toast.error('Download failed');
    }
  };

  const filteredItems = sharedItems.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'file') return item.resourceType === 'file';
    if (filter === 'folder') return item.resourceType === 'folder';
    return true;
  });

  const levelBadge = (level: string) => {
    const map: Record<string, { bg: string; color: string }> = {
      view: { bg: 'rgba(45, 212, 191, 0.2)', color: 'var(--accent-teal)' },
      edit: { bg: 'rgba(45, 212, 191, 0.2)', color: 'var(--accent-teal)' },
      delete: { bg: 'rgba(255, 107, 107, 0.2)', color: 'var(--accent-coral)' },
      owner: { bg: 'rgba(255, 173, 86, 0.2)', color: 'var(--accent-amber)' },
    };
    return map[level] || { bg: 'rgba(42, 42, 62, 0.2)', color: 'var(--text-secondary)' };
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', color: 'var(--text-primary)', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
        >
          ← Dashboard
        </button>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Shared with Me</h1>
        <div style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-secondary)' }}>
          {sharedItems.length} item{sharedItems.length !== 1 ? 's' : ''} shared with you
        </div>
      </div>

      <div style={{ padding: '24px 32px' }}>
        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {(['all', 'file', 'folder'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 16px', border: 'none', borderRadius: 6, cursor: 'pointer',
                fontWeight: 600, fontSize: 13, textTransform: 'capitalize',
                background: filter === f ? 'var(--accent-purple)' : 'var(--surface)',
                color: filter === f ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              {f === 'all' ? 'All' : f === 'file' ? '📄 Files' : '📁 Folders'}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
            <div style={{ width: 36, height: 36, border: '3px solid var(--surface)', borderTopColor: 'var(--accent-purple)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 80, color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🔗</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>Nothing shared with you yet</div>
            <div style={{ fontSize: 14 }}>Files and folders shared by others will appear here</div>
          </div>
        ) : (
          <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-page)', color: 'var(--text-secondary)' }}>
                  {['Name', 'Type', 'Shared By', 'Permission', 'Shared On', 'Actions'].map((h) => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const resource = item.file || item.folder;
                  const badge = levelBadge(item.permissionLevel);
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--bg-page)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 20 }}>
                            {item.resourceType === 'file' ? getIcon(resource?.mimeType) : '📁'}
                          </span>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{resource?.name || 'Unknown'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                        {item.resourceType}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: 11 }}>
                        {item.granter?.clerkUserId?.slice(0, 16)}…
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: 4, fontSize: 11,
                          fontWeight: 700, textTransform: 'uppercase',
                          background: badge.bg, color: badge.color,
                        }}>
                          {item.permissionLevel}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                        {new Date(item.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {item.resourceType === 'file' && (
                            <>
                              <button
                                onClick={() => setPreviewFile(resource)}
                                style={actionBtn}
                              >
                                👁 Preview
                              </button>
                              <button
                                onClick={() => handleDownload(resource)}
                                style={actionBtn}
                              >
                                ⬇ Download
                              </button>
                            </>
                          )}
                          {item.resourceType === 'folder' && (
                            <button
                              onClick={() => navigate('/', { state: { folderId: resource?.id, fromSharedPage: true } })}
                              style={actionBtn}
                            >
                              📂 Open
                            </button>
                          )}
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

      {previewFile && (
        <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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

const actionBtn: React.CSSProperties = {
  padding: '4px 10px', background: 'var(--bg-page)', color: 'var(--text-secondary)',
  border: '1px solid var(--border)', borderRadius: 5, cursor: 'pointer', fontSize: 12, fontWeight: 600,
};