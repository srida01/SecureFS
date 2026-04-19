import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function AdminPanel() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [tab, setTab] = useState<'logs' | 'users'>('logs');

  useEffect(() => {
    loadData();
  }, [tab]);

  const loadData = async () => {
    try {
      if (tab === 'logs') {
        const res = await api.get('/admin/audit-logs');
        setLogs(res.data.data);
      } else {
        const res = await api.get('/admin/users');
        setUsers(res.data.data);
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Access denied');
      navigate('/');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', padding: 32, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: '1px solid #334155', color: '#94a3b8', padding: '6px 14px', borderRadius: 6, cursor: 'pointer' }}>← Back</button>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Admin Panel</h1>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {(['logs', 'users'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '8px 20px', background: tab === t ? '#6366f1' : '#1e293b', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, textTransform: 'capitalize' }}>{t}</button>
        ))}
      </div>

      {tab === 'logs' && (
        <div style={{ background: '#1e293b', borderRadius: 10, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#0f172a', color: '#64748b' }}>
                {['Time', 'Actor', 'Action', 'Resource', 'Status', 'IP'].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid #334155' }}>
                  <td style={{ padding: '10px 16px', color: '#64748b' }}>{new Date(log.createdAt).toLocaleString()}</td>
                  <td style={{ padding: '10px 16px' }}>{log.actor?.clerkUserId?.slice(0, 16)}…</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 4, background: actionColor(log.action), fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>{log.action}</span>
                  </td>
                  <td style={{ padding: '10px 16px', color: '#94a3b8' }}>{log.resourceType || '-'}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ color: log.status === 'success' ? '#22c55e' : '#ef4444' }}>{log.status}</span>
                  </td>
                  <td style={{ padding: '10px 16px', color: '#475569' }}>{log.ipAddress || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'users' && (
        <div style={{ background: '#1e293b', borderRadius: 10, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#0f172a', color: '#64748b' }}>
                {['ID', 'Clerk ID', 'Role', 'Storage Used', 'Quota', 'Joined'].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid #334155' }}>
                  <td style={{ padding: '10px 16px', color: '#475569' }}>{u.id.slice(0, 8)}…</td>
                  <td style={{ padding: '10px 16px' }}>{u.clerkUserId?.slice(0, 20)}…</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 4, background: u.role === 'admin' ? '#7c3aed' : '#334155', fontSize: 11, fontWeight: 700 }}>{u.role}</span>
                  </td>
                  <td style={{ padding: '10px 16px' }}>{u.storageQuota ? fmtBytes(Number(u.storageQuota.usedBytes)) : '—'}</td>
                  <td style={{ padding: '10px 16px' }}>{u.storageQuota ? fmtBytes(Number(u.storageQuota.quotaBytes)) : '—'}</td>
                  <td style={{ padding: '10px 16px', color: '#64748b' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function actionColor(action: string) {
  const map: Record<string, string> = { upload: '#0ea5e9', download: '#22c55e', delete: '#ef4444', share: '#f59e0b', login: '#6366f1', logout: '#475569' };
  return map[action] || '#334155';
}

function fmtBytes(b: number) {
  if (b >= 1e9) return `${(b / 1e9).toFixed(1)} GB`;
  if (b >= 1e6) return `${(b / 1e6).toFixed(1)} MB`;
  return `${(b / 1e3).toFixed(0)} KB`;
}