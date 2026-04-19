import React, { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import FilePreviewModal from './FilePreviewModal.tsx';
import VersionHistoryModal from './VersionHistoryModal';

interface Props {
  folders: any[];
  files: any[];
  onFolderClick: (id: string) => void;
  onDelete: (type: 'file' | 'folder', id: string) => void;
  onBatchDelete?: (ids: string[], type: 'file' | 'folder') => void;
  onDownload: (id: string, name: string) => void;
  onShare: (item: any) => void;
  onRefresh: () => void;
  selectedItems?: Set<string>;
  onSelectionChange?: (selected: Set<string>) => void;
  canRename?: boolean;
  canDelete?: boolean;
}

const FILE_ICONS: Record<string, string> = {
  'image/': '🖼️',
  'video/': '🎬',
  'audio/': '🎵',
  'application/pdf': '📕',
  'text/': '📝',
  'application/zip': '📦',
  'application/': '📎',
};

function getIcon(mimeType: string) {
  for (const [k, v] of Object.entries(FILE_ICONS)) {
    if (mimeType?.startsWith(k)) return v;
  }
  return '📄';
}

type ContextMenu = { x: number; y: number; item: any; type: 'file' | 'folder' } | null;

export default function FileGrid({ folders, files, onFolderClick, onDelete, onBatchDelete, onDownload, onShare, onRefresh, selectedItems = new Set(), onSelectionChange, canRename = true, canDelete = true }: Props) {
  const { getToken } = useAuth();
  const [contextMenu, setContextMenu] = useState<ContextMenu>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameType, setRenameType] = useState<'file' | 'folder'>('file');
  const [previewFile, setPreviewFile] = useState<any>(null);
  const [versionFile, setVersionFile] = useState<any>(null);

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    onSelectionChange?.(newSelected);
  };

  const selectAll = () => {
    const allIds = new Set([...folders.map((f) => f.id), ...files.map((f) => f.id)]);
    onSelectionChange?.(allIds);
  };

  const clearSelection = () => {
    onSelectionChange?.(new Set());
  };

  const handleRightClick = (e: React.MouseEvent, item: any, type: 'file' | 'folder') => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, item, type });
  };

  const close = () => setContextMenu(null);

  const startRename = (item: any, type: 'file' | 'folder') => {
    setRenamingId(item.id);
    setRenameValue(item.name);
    setRenameType(type);
    close();
  };

  const commitRename = async (id: string) => {
    if (!renameValue.trim()) { setRenamingId(null); return; }
    try {
      const token = await getToken();
      const endpoint = renameType === 'file' ? `/files/${id}` : `/folders/${id}`;
      await api.patch(endpoint, { name: renameValue }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Renamed successfully');
      onRefresh();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Rename failed');
    } finally {
      setRenamingId(null);
    }
  };

  const fmtSize = (b: number) => {
    if (b >= 1e6) return `${(b / 1e6).toFixed(1)} MB`;
    return `${(b / 1e3).toFixed(0)} KB`;
  };

  if (folders.length === 0 && files.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', color: '#475569' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>☁️</div>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: '#64748b' }}>This folder is empty</div>
        <div style={{ fontSize: 14 }}>Upload files or folders, or create a folder to get started</div>
      </div>
    );
  }

  return (
    <div onClick={close}>
      {/* Batch selection bar */}
      {selectedItems.size > 0 && (
        <div style={{ background: '#1e293b', padding: '12px 24px', border: '1px solid #334155', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>{selectedItems.size} selected</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {canDelete && (
              <button
                onClick={() => {
                  const fileIds = Array.from(selectedItems).filter((id) => files.some((f) => f.id === id));
                  const folderIds = Array.from(selectedItems).filter((id) => folders.some((f) => f.id === id));
                  if (fileIds.length > 0 && onBatchDelete) onBatchDelete(fileIds, 'file');
                  if (folderIds.length > 0 && onBatchDelete) onBatchDelete(folderIds, 'folder');
                }}
                style={{ padding: '6px 12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
              >
                🗑 Delete Selected
              </button>
            )}
            <button
              onClick={clearSelection}
              style={{ padding: '6px 12px', background: '#334155', color: '#e2e8f0', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
            >
              Clear
            </button>
          </div>
          <button
            onClick={selectAll}
            style={{ padding: '6px 12px', background: '#334155', color: '#e2e8f0', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, marginLeft: 'auto' }}
          >
            Select All
          </button>
        </div>
      )}
      
      {folders.length > 0 && (
        <>
          <div style={sectionLabel}>Folders</div>
          <div style={grid}>
            {folders.map((f) => (
              <div
                key={f.id}
                onDoubleClick={() => onFolderClick(f.id)}
                onContextMenu={(e) => handleRightClick(e, f, 'folder')}
                style={{ ...card, border: selectedItems.has(f.id) ? '2px solid #6366f1' : card.border, background: selectedItems.has(f.id) ? '#1e293b' : card.background }}
              >
                <label onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedItems.has(f.id)}
                    onChange={() => toggleSelection(f.id)}
                    style={{ cursor: 'pointer' }}
                  />
                </label>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📁</div>
                {renamingId === f.id ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename(f.id);
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                    onBlur={() => commitRename(f.id)}
                    onClick={(e) => e.stopPropagation()}
                    style={renameInput}
                  />
                ) : (
                  <div style={cardName}>{f.name}</div>
                )}
                <div style={cardHint}>Double-click to open · Right-click for options</div>
              </div>
            ))}
          </div>
        </>
      )}

      {files.length > 0 && (
        <>
          <div style={{ ...sectionLabel, marginTop: folders.length > 0 ? 24 : 0 }}>Files</div>
          <div style={grid}>
            {files.map((f) => (
              <div
                key={f.id}
                onDoubleClick={() => setPreviewFile(f)}
                onContextMenu={(e) => handleRightClick(e, f, 'file')}
                style={{ ...card, border: selectedItems.has(f.id) ? '2px solid #6366f1' : card.border, background: selectedItems.has(f.id) ? '#1e293b' : card.background }}
              >
                <label onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedItems.has(f.id)}
                    onChange={() => toggleSelection(f.id)}
                    style={{ cursor: 'pointer' }}
                  />
                </label>
                <div style={{ fontSize: 36, marginBottom: 8 }}>{getIcon(f.mimeType || '')}</div>
                {renamingId === f.id ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename(f.id);
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                    onBlur={() => commitRename(f.id)}
                    onClick={(e) => e.stopPropagation()}
                    style={renameInput}
                  />
                ) : (
                  <div style={cardName}>{f.name}</div>
                )}
                <div style={cardHint}>{fmtSize(Number(f.sizeBytes))} · Double-click to preview</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed', top: contextMenu.y, left: contextMenu.x,
            background: '#1e293b', border: '1px solid #334155', borderRadius: 8,
            zIndex: 200, minWidth: 180, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === 'file' && (
            <>
              <button onClick={() => { setPreviewFile(contextMenu.item); close(); }} style={menuBtn}>
                👁 Preview
              </button>
              <button onClick={() => { onDownload(contextMenu.item.id, contextMenu.item.name); close(); }} style={menuBtn}>
                ⬇ Download
              </button>
              <button onClick={() => { setVersionFile(contextMenu.item); close(); }} style={menuBtn}>
                🕐 Version History
              </button>
            </>
          )}
          {contextMenu.type === 'folder' && (
            <button onClick={() => { onFolderClick(contextMenu.item.id); close(); }} style={menuBtn}>
              📂 Open
            </button>
          )}
          {canRename && (
            <button onClick={() => startRename(contextMenu.item, contextMenu.type)} style={menuBtn}>
              ✏️ Rename
            </button>
          )}
          <button onClick={() => { onShare(contextMenu.item); close(); }} style={menuBtn}>
            🔗 Share
          </button>
          <div style={{ height: 1, background: '#334155', margin: '4px 0' }} />
          {canDelete && (
            <button
              onClick={() => { onDelete(contextMenu.type, contextMenu.item.id); close(); }}
              style={{ ...menuBtn, color: '#ef4444' }}
            >
              🗑 Delete
            </button>
          )}
        </div>
      )}

      {/* Modals */}
      {previewFile && (
        <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
      )}
      {versionFile && (
        <VersionHistoryModal file={versionFile} onClose={() => { setVersionFile(null); onRefresh(); }} />
      )}
    </div>
  );
}

const grid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
  gap: 12,
};
const card: React.CSSProperties = {
  background: '#1e293b', borderRadius: 10, padding: '16px 14px',
  cursor: 'pointer', border: '1px solid #334155',
  transition: 'border-color 0.15s',
};
const sectionLabel: React.CSSProperties = {
  fontSize: 11, color: '#475569', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12,
};
const cardName: React.CSSProperties = {
  fontSize: 13, fontWeight: 600, color: '#e2e8f0',
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};
const cardHint: React.CSSProperties = {
  fontSize: 10, color: '#334155', marginTop: 4,
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};
const renameInput: React.CSSProperties = {
  width: '100%', padding: '4px 6px', background: '#0f172a',
  border: '1px solid #6366f1', color: '#e2e8f0', borderRadius: 4,
  fontSize: 12, boxSizing: 'border-box',
};
const menuBtn: React.CSSProperties = {
  display: 'block', width: '100%', padding: '9px 16px',
  background: 'none', border: 'none', color: '#e2e8f0',
  cursor: 'pointer', textAlign: 'left', fontSize: 13,
};
