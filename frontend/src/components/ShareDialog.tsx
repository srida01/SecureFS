import React, { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';

interface Props {
  resource: any;
  onClose: () => void;
}

export default function ShareDialog({ resource, onClose }: Props) {
  const [tab, setTab] = useState<'users' | 'links'>('users');
  const [granteeClerkUserId, setGranteeClerkUserId] = useState('');
  const [level, setLevel] = useState('view');
  
  // Share link state
  const [password, setPassword] = useState('');
  const [expiresIn, setExpiresIn] = useState('7'); // days
  const [shareLink, setShareLink] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const shareWithUser = async () => {
    if (!granteeClerkUserId) return toast.error('Enter a user ID');
    try {
      await api.post('/permissions/share', {
        granteeClerkUserId,
        resourceId: resource.id,
        resourceType: resource.folderId ? 'file' : 'folder',
        permissionLevel: level,
      });
      toast.success('Shared successfully');
      onClose();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Share failed');
    }
  };

  const createShareLink = async () => {
    try {
      setLoading(true);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(expiresIn));

      const response = await api.post('/share-links', {
        resourceId: resource.id,
        resourceType: resource.folderId ? 'file' : 'folder',
        password: password || undefined,
        expiresAt: expiresAt.toISOString(),
      });

      const token = response.data.data.token;
      const link = `${window.location.origin}/shared/${token}`;
      setShareLink(link);
      toast.success('Share link created!');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to create share link');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    toast.success('Link copied to clipboard!');
  };

  const resetLinkForm = () => {
    setShareLink('');
    setPassword('');
    setExpiresIn('7');
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
      <div style={{ background: '#1e293b', borderRadius: 12, padding: 28, width: 450, border: '1px solid #334155', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 20, color: '#e2e8f0' }}>Share "{resource.name}"</div>
        
        {/* Tab Buttons */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, borderBottom: '1px solid #334155', paddingBottom: 12 }}>
          <button
            onClick={() => setTab('users')}
            style={{
              padding: '8px 16px',
              background: tab === 'users' ? '#6366f1' : 'transparent',
              color: '#e2e8f0',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Share with User
          </button>
          <button
            onClick={() => setTab('links')}
            style={{
              padding: '8px 16px',
              background: tab === 'links' ? '#6366f1' : 'transparent',
              color: '#e2e8f0',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Create Share Link
          </button>
        </div>

        {/* Share with User Tab */}
        {tab === 'users' && (
          <div>
            <label style={{ fontSize: 13, color: '#94a3b8', display: 'block', marginBottom: 6 }}>User ID to share with</label>
            <input
              value={granteeClerkUserId}
              onChange={(e) => setGranteeClerkUserId(e.target.value)}
              placeholder="Paste user ID"
              style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', borderRadius: 6, marginBottom: 16, boxSizing: 'border-box' }}
            />
            <label style={{ fontSize: 13, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Permission Level</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', borderRadius: 6, marginBottom: 24 }}
            >
              <option value="view">View only</option>
              <option value="edit">Edit</option>
              <option value="delete">Full access (delete)</option>
            </select>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={{ padding: '8px 18px', background: '#475569', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
              <button onClick={shareWithUser} style={{ padding: '8px 18px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Share</button>
            </div>
          </div>
        )}

        {/* Create Share Link Tab */}
        {tab === 'links' && (
          <div>
            {shareLink ? (
              <div>
                <label style={{ fontSize: 13, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Your Share Link</label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <input
                    readOnly
                    value={shareLink}
                    style={{ flex: 1, padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', color: '#10b981', borderRadius: 6, boxSizing: 'border-box', fontSize: 12, fontFamily: 'monospace' }}
                  />
                  <button
                    onClick={copyToClipboard}
                    style={{ padding: '8px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500 }}
                  >
                    Copy
                  </button>
                </div>
                <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>Share this link to let others access your {resource.folderId ? 'file' : 'folder'}.</p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button onClick={resetLinkForm} style={{ padding: '8px 18px', background: '#475569', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Create Another</button>
                  <button onClick={onClose} style={{ padding: '8px 18px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Done</button>
                </div>
              </div>
            ) : (
              <div>
                <label style={{ fontSize: 13, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Password (optional)</label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  placeholder="Leave empty for public link"
                  style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', borderRadius: 6, marginBottom: 16, boxSizing: 'border-box' }}
                />
                <label style={{ fontSize: 13, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Expires in (days)</label>
                <select
                  value={expiresIn}
                  onChange={(e) => setExpiresIn(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', borderRadius: 6, marginBottom: 24 }}
                >
                  <option value="1">1 day</option>
                  <option value="7">7 days</option>
                  <option value="30">30 days</option>
                  <option value="90">90 days</option>
                </select>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button onClick={onClose} style={{ padding: '8px 18px', background: '#475569', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
                  <button
                    onClick={createShareLink}
                    disabled={loading}
                    style={{ padding: '8px 18px', background: loading ? '#94a3b8' : '#6366f1', color: '#fff', border: 'none', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer' }}
                  >
                    {loading ? 'Creating...' : 'Create Link'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}