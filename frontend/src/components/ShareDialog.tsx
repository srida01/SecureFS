import React, { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';

interface Props {
  resource: any;
  onClose: () => void;
}

export default function ShareDialog({ resource, onClose }: Props) {
  const [granteeUserId, setGranteeUserId] = useState('');
  const [level, setLevel] = useState('view');

  const share = async () => {
    if (!granteeUserId) return toast.error('Enter a user ID');
    try {
      await api.post('/permissions/share', {
        granteeUserId,
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

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
      <div style={{ background: '#1e293b', borderRadius: 12, padding: 28, width: 400, border: '1px solid #334155' }}>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 20, color: '#e2e8f0' }}>Share "{resource.name}"</div>
        <label style={{ fontSize: 13, color: '#94a3b8', display: 'block', marginBottom: 6 }}>User ID to share with</label>
        <input
          value={granteeUserId}
          onChange={(e) => setGranteeUserId(e.target.value)}
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
          <button onClick={share} style={{ padding: '8px 18px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Share</button>
        </div>
      </div>
    </div>
  );
}