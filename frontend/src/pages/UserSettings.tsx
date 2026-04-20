import React, { useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function UserSettings() {
  const { getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [tab, setTab] = useState<'profile' | 'activity'>('profile');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const [profileRes, logsRes] = await Promise.all([
        api.post('/auth/sync', {}, { headers: { Authorization: `Bearer ${token}` } }),
        api.get('/audit-logs/me', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { data: [] } })),
      ]);
      setProfile(profileRes.data.data);
      setAuditLogs(logsRes.data.data || []);
    } catch (e: any) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const fmtBytes = (b: number) => {
    if (b >= 1e9) return `${(b / 1e9).toFixed(2)} GB`;
    if (b >= 1e6) return `${(b / 1e6).toFixed(1)} MB`;
    return `${(b / 1e3).toFixed(0)} KB`;
  };

  const quota = profile?.storageQuota;
  const used = quota ? Number(quota.usedBytes) : 0;
  const total = quota ? Number(quota.quotaBytes) : 0;
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;

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
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Settings</h1>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          {(['profile', 'activity'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '8px 20px', border: 'none', borderRadius: 8, cursor: 'pointer',
                fontWeight: 600, fontSize: 14, textTransform: 'capitalize',
                background: tab === t ? 'var(--accent-purple)' : 'var(--surface)',
                color: tab === t ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              {t === 'profile' ? '👤 Profile' : '📋 Activity'}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
            <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--accent-purple)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : tab === 'profile' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Identity card */}
            <div style={card}>
              <div style={cardTitle}>Account</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                <img
                  src={clerkUser?.imageUrl}
                  alt="avatar"
                  style={{ width: 56, height: 56, borderRadius: '50%', border: '2px solid var(--border)' }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
                    {clerkUser?.fullName || clerkUser?.username || 'User'}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {clerkUser?.emailAddresses[0]?.emailAddress}
                  </div>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  <span style={{
                    padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                    background: profile?.role === 'admin' ? 'var(--accent-purple-bg)' : 'var(--border)',
                    color: profile?.role === 'admin' ? 'var(--accent-lavender)' : 'var(--text-secondary)',
                    textTransform: 'uppercase',
                  }}>
                    {profile?.role || 'viewer'}
                  </span>
                </div>
              </div>
              <div style={infoRow}>
                <span style={infoLabel}>User ID</span>
                <span style={infoValue}>{profile?.id?.slice(0, 8)}…</span>
              </div>
              <div style={infoRow}>
                <span style={infoLabel}>Clerk ID</span>
                <span style={{ ...infoValue, fontFamily: 'monospace', fontSize: 11 }}>{profile?.clerkUserId}</span>
              </div>
              <div style={infoRow}>
                <span style={infoLabel}>Joined</span>
                <span style={infoValue}>{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</span>
              </div>
            </div>

            {/* Storage card */}
            {quota && (
              <div style={card}>
                <div style={cardTitle}>Storage Quota</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{fmtBytes(used)} used</span>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{fmtBytes(total)} total</span>
                </div>
                <div style={{ background: 'var(--bg-base)', borderRadius: 6, height: 10, marginBottom: 12, overflow: 'hidden' }}>
                  <div style={{
                    width: `${pct}%`, height: 10, borderRadius: 6, transition: 'width 0.4s',
                    background: pct > 90 ? 'var(--accent-coral)' : pct > 70 ? 'var(--accent-amber)' : 'var(--accent-purple)',
                  }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <StatBox label="Used" value={fmtBytes(used)} color="var(--accent-purple)" />
                  <StatBox label="Free" value={fmtBytes(Math.max(0, total - used))} color="var(--accent-teal)" />
                  <StatBox label="Usage" value={`${pct.toFixed(1)}%`} color={pct > 80 ? 'var(--accent-coral)' : 'var(--text-secondary)'} />
                </div>
              </div>
            )}

            {/* Manage account via Clerk */}
            <div style={card}>
              <div style={cardTitle}>Manage Account</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                Change your name, email, password, or connected accounts through Clerk.
              </div>
              <a
                href={`${import.meta.env.REACT_APP_CLERK_ACCOUNT_URL || 'https://accounts.clerk.dev'}`}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'inline-block', padding: '8px 20px', background: 'var(--border)', color: 'var(--text-primary)', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 13 }}
              >
                Open Account Settings ↗
              </a>
            </div>
          </div>
        ) : (
          /* Activity tab */
          <div style={card}>
            <div style={cardTitle}>Recent Activity</div>
            {auditLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                <div>No recent activity</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {auditLogs.slice(0, 50).map((log) => (
                  <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: actionColor(log.action) + '20',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14,
                    }}>
                      {actionIcon(log.action)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                        <span style={{ textTransform: 'capitalize', fontWeight: 700 }}>{log.action}</span>
                        {log.resourceType && <span style={{ color: 'var(--text-muted)' }}> · {log.resourceType}</span>}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {log.ipAddress && <span>{log.ipAddress} · </span>}
                        {new Date(log.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                      background: log.status === 'success' ? 'rgba(45, 212, 191, 0.2)' : 'rgba(255, 107, 107, 0.2)',
                      color: log.status === 'success' ? 'var(--accent-teal)' : 'var(--accent-coral)',
                      textTransform: 'uppercase',
                    }}>
                      {log.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: 'var(--bg-base)', borderRadius: 8, padding: '12px 14px' }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function actionColor(action: string) {
  const map: Record<string, string> = { upload: 'var(--accent-teal)', download: 'var(--accent-teal)', delete: 'var(--accent-coral)', share: 'var(--accent-amber)', login: 'var(--accent-purple)', logout: 'var(--text-muted)' };
  return map[action] || 'var(--accent-purple)';
}
function actionIcon(action: string) {
  const map: Record<string, string> = { upload: '↑', download: '↓', delete: '🗑', share: '🔗', login: '🔐', logout: '🚪', create: '✨', view: '👁' };
  return map[action] || '•';
}

const card: React.CSSProperties = {
  background: 'var(--surface)', borderRadius: 12, padding: '20px 24px', border: '1px solid var(--border)',
};
const cardTitle: React.CSSProperties = {
  fontWeight: 700, fontSize: 14, color: 'var(--text-secondary)', textTransform: 'uppercase',
  letterSpacing: 0.5, marginBottom: 16,
};
const infoRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 16, padding: '8px 0', borderBottom: '1px solid var(--border)',
};
const infoLabel: React.CSSProperties = { fontSize: 12, color: 'var(--text-muted)', width: 100, flexShrink: 0 };
const infoValue: React.CSSProperties = { fontSize: 13, color: 'var(--text-primary)' };
