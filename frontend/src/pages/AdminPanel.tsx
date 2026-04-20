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
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', color: 'var(--text-primary)', padding: 32, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '6px 14px', borderRadius: 6, cursor: 'pointer' }}>← Back</button>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Admin Panel</h1>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {(['logs', 'users'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '8px 20px', background: tab === t ? 'var(--accent-purple)' : 'var(--surface)', color: 'var(--text-primary)', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, textTransform: 'capitalize' }}>{t}</button>
        ))}
      </div>

      {tab === 'logs' && (
        <div style={{ background: 'var(--surface)', borderRadius: 10, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-base)', color: 'var(--text-secondary)' }}>
                {['Time', 'Actor', 'Action', 'Resource', 'Status', 'IP'].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>{new Date(log.createdAt).toLocaleString()}</td>
                  <td style={{ padding: '10px 16px' }}>{log.actor?.clerkUserId?.slice(0, 16)}…</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 4, background: actionColor(log.action), fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-primary)' }}>{log.action}</span>
                  </td>
                  <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>{log.resourceType || '-'}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ color: log.status === 'success' ? 'var(--accent-teal)' : 'var(--accent-coral)' }}>{log.status}</span>
                  </td>
                  <td style={{ padding: '10px 16px', color: 'var(--text-muted)' }}>{log.ipAddress || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'users' && (
        <div style={{ background: 'var(--surface)', borderRadius: 10, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-base)', color: 'var(--text-secondary)' }}>
                {['ID', 'Clerk ID', 'Role', 'Storage Used', 'Quota', 'Joined'].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 16px', color: 'var(--text-muted)' }}>{u.id.slice(0, 8)}…</td>
                  <td style={{ padding: '10px 16px' }}>{u.clerkUserId?.slice(0, 20)}…</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 4, background: u.role === 'admin' ? 'var(--accent-purple)' : 'var(--border)', fontSize: 11, fontWeight: 700, color: u.role === 'admin' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{u.role}</span>
                  </td>
                  <td style={{ padding: '10px 16px' }}>{u.storageQuota ? fmtBytes(Number(u.storageQuota.usedBytes)) : '—'}</td>
                  <td style={{ padding: '10px 16px' }}>{u.storageQuota ? fmtBytes(Number(u.storageQuota.quotaBytes)) : '—'}</td>
                  <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
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
  const map: Record<string, string> = { upload: 'var(--accent-teal)', download: 'var(--accent-teal)', delete: 'var(--accent-coral)', share: 'var(--accent-amber)', login: 'var(--accent-purple)', logout: 'var(--text-muted)' };
  return map[action] || 'var(--border)';
}

function fmtBytes(b: number) {
  if (b >= 1e9) return `${(b / 1e9).toFixed(1)} GB`;
  if (b >= 1e6) return `${(b / 1e6).toFixed(1)} MB`;
  return `${(b / 1e3).toFixed(0)} KB`;
}