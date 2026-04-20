import React from 'react';

interface Props {
  quota: { quotaBytes: number; usedBytes: number } | null;
}

export default function StorageWidget({ quota }: Props) {
  if (!quota) return null;

  const used = Number(quota.usedBytes);
  const total = Number(quota.quotaBytes);
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const fmt = (b: number) => {
    if (b >= 1e9) return `${(b / 1e9).toFixed(1)} GB`;
    if (b >= 1e6) return `${(b / 1e6).toFixed(1)} MB`;
    return `${(b / 1e3).toFixed(0)} KB`;
  };

  return (
    <div style={{ background: 'var(--bg-page)', borderRadius: 10, padding: 14 }}>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>Storage</div>
      <div style={{ background: 'var(--surface)', borderRadius: 4, height: 8, marginBottom: 8 }}>
        <div style={{ width: `${pct}%`, background: pct > 80 ? 'var(--accent-coral)' : 'var(--accent-purple)', height: 8, borderRadius: 4, transition: 'width 0.3s' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)' }}>
        <span>{fmt(used)} used</span>
        <span>{fmt(total)} total</span>
      </div>
    </div>
  );
}