import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { folderService } from '../services/fileService';
import { setCurrentFolder, toggleFolderExpanded, cacheFolderChildren, addFolderOptimistic, removeFolderOptimistic, renameFolderOptimistic } from '../store/fileSlice';
import type { RootState } from '../store/store';

interface Breadcrumb {
  id: string;
  name: string;
}

interface ContextMenuState {
  x: number;
  y: number;
  folderId: string;
  parentId: string | null;
}

interface FolderNodeProps {
  folder: any;
  parentId: string | null;
  onSelect: (id: string, name: string) => void;
  isActive: boolean;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  breadcrumbs: Breadcrumb[];
  onBreadcrumbChange: (crumbs: Breadcrumb[]) => void;
}

const FolderNode: React.FC<FolderNodeProps> = ({
  folder,
  parentId,
  onSelect,
  isActive,
  isExpanded,
  onToggleExpand,
  breadcrumbs,
  onBreadcrumbChange,
}) => {
  const dispatch = useDispatch();
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState(folder.name);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);

  // Load children when expanded
  useEffect(() => {
    if (isExpanded && children.length === 0 && !loading) {
      loadChildren();
    }
  }, [isExpanded]);

  const loadChildren = async () => {
    try {
      setLoading(true);
      const subs = await folderService.getFolders(folder.id);
      setChildren(subs);
      dispatch(cacheFolderChildren({ parentId: folder.id, children: subs }));
    } catch (e) {
      toast.error('Failed to load subfolders');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = () => {
    onSelect(folder.id, folder.name);
    // Update breadcrumbs
    const existing = breadcrumbs.findIndex(b => b.id === folder.id);
    if (existing >= 0) {
      onBreadcrumbChange(breadcrumbs.slice(0, existing + 1));
    } else {
      onBreadcrumbChange([...breadcrumbs, { id: folder.id, name: folder.name }]);
    }
  };

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, folderId: folder.id, parentId });
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const newFolder = await folderService.createFolder(newFolderName, folder.id);
      // Optimistic update
      dispatch(addFolderOptimistic({ parentId: folder.id, folder: newFolder }));
      setChildren(prev => [...prev, newFolder]);
      setNewFolderName('');
      setShowNewFolder(false);
      toast.success('Folder created');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to create folder');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${folder.name}" and all its contents?`)) return;
    try {
      // Optimistic update
      dispatch(removeFolderOptimistic({ folderId: folder.id, parentId }));
      setChildren(prev => prev.filter(c => c.id !== folder.id));
      await folderService.deleteFolder(folder.id);
      toast.success('Folder moved to trash');
      setContextMenu(null);
    } catch (e: any) {
      // Revert on error
      await loadChildren();
      toast.error(e.response?.data?.message || 'Failed to delete folder');
    }
  };

  const handleRename = async () => {
    if (!renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    if (renameValue === folder.name) {
      setRenamingId(null);
      return;
    }
    try {
      // Optimistic update
      folder.name = renameValue;
      dispatch(renameFolderOptimistic({ folderId: folder.id, newName: renameValue }));
      
      await folderService.renameFolder(folder.id, renameValue);
      setRenamingId(null);
      toast.success('Folder renamed');
      setContextMenu(null);
    } catch (e: any) {
      // Revert on error
      toast.error(e.response?.data?.message || 'Failed to rename folder');
      setRenamingId(null);
    }
  };

  const nodeStyle: React.CSSProperties = {
    padding: '6px 8px',
    borderRadius: 4,
    cursor: 'pointer',
    backgroundColor: isActive ? 'var(--accent-bg)' : 'transparent',
    color: isActive ? 'var(--accent-purple)' : 'var(--text-secondary)',
    fontWeight: isActive ? 600 : 500,
    fontSize: 13,
    transition: 'background-color 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
    userSelect: 'none',
  };

  const toggleStyle: React.CSSProperties = {
    width: 16,
    height: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: 12,
    flexShrink: 0,
  };

  const containerStyle: React.CSSProperties = {
    marginLeft: 12,
    borderLeft: '1px solid var(--border)',
    paddingLeft: 4,
    marginTop: 2,
  };

  const contextMenuStyle: React.CSSProperties = {
    position: 'fixed',
    top: contextMenu?.y || 0,
    left: contextMenu?.x || 0,
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    zIndex: 10000,
    minWidth: 180,
  };

  const menuItemStyle: React.CSSProperties = {
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: 12,
    color: 'var(--text-secondary)',
    borderBottom: '1px solid var(--border)',
    transition: 'background-color 0.2s',
  };

  return (
    <>
      <div style={nodeStyle} onClick={handleSelect} onContextMenu={handleRightClick}>
        <div style={toggleStyle} onClick={(e) => { e.stopPropagation(); onToggleExpand(folder.id); }}>
          {children.length > 0 || !loading ? (isExpanded ? '▼' : '▶') : '•'}
        </div>
        {renamingId === folder.id ? (
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') setRenamingId(null);
            }}
            onBlur={handleRename}
            onClick={(e) => e.stopPropagation()}
            style={{
              border: '1px solid var(--accent-purple)',
              borderRadius: 3,
              padding: '2px 4px',
              fontSize: 13,
              flex: 1,
            }}
          />
        ) : (
          <span>📁 {folder.name}</span>
        )}
      </div>

      {isExpanded && (
        <div style={containerStyle}>
          {showNewFolder && (
            <div style={{ display: 'flex', gap: 4, marginBottom: 8, fontSize: 12 }}>
              <input
                autoFocus
                type="text"
                placeholder="Folder name..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFolder();
                  if (e.key === 'Escape') { setNewFolderName(''); setShowNewFolder(false); }
                }}
                style={{
                  flex: 1,
                  padding: '4px 6px',
                  border: '1px solid var(--border-color)',
                  borderRadius: 3,
                  fontSize: 12,
                }}
              />
              <button
                onClick={handleCreateFolder}
                style={{
                  padding: '4px 8px',
                  backgroundColor: 'var(--accent-purple)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 3,
                  cursor: 'pointer',
                  fontSize: 11,
                }}
              >
                ✓
              </button>
              <button
                onClick={() => { setShowNewFolder(false); setNewFolderName(''); }}
                style={{
                  padding: '4px 8px',
                  backgroundColor: 'var(--border-color)',
                  border: 'none',
                  borderRadius: 3,
                  cursor: 'pointer',
                  fontSize: 11,
                }}
              >
                ✕
              </button>
            </div>
          )}
          {children.map((child) => (
            <FolderNode
              key={child.id}
              folder={child}
              parentId={folder.id}
              onSelect={onSelect}
              isActive={false}
              isExpanded={false}
              onToggleExpand={onToggleExpand}
              breadcrumbs={breadcrumbs}
              onBreadcrumbChange={onBreadcrumbChange}
            />
          ))}
          {!showNewFolder && (
            <div
              onClick={() => setShowNewFolder(true)}
              style={{
                padding: '4px 8px',
                fontSize: 11,
                color: 'var(--text-muted)',
                cursor: 'pointer',
                marginTop: 4,
              }}
            >
              + New folder
            </div>
          )}
        </div>
      )}

      {contextMenu && contextMenu.folderId === folder.id && (
        <div
          style={contextMenuStyle}
          onClick={(e) => e.stopPropagation()}
          onMouseLeave={() => setContextMenu(null)}
        >
          <div
            style={menuItemStyle}
            onClick={() => { setShowNewFolder(true); setContextMenu(null); }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--hover-bg)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            ➕ New Folder
          </div>
          <div
            style={menuItemStyle}
            onClick={() => { setRenamingId(folder.id); setContextMenu(null); }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--hover-bg)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            ✏️ Rename
          </div>
          <div
            style={menuItemStyle}
            onClick={handleDelete}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--hover-bg)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            🗑️ Delete
          </div>
        </div>
      )}
    </>
  );
};

// Breadcrumb component
const BreadcrumbTrail: React.FC<{
  breadcrumbs: Breadcrumb[];
  onNavigate: (index: number) => void;
}> = ({ breadcrumbs, onNavigate }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, marginBottom: 12 }}>
      {breadcrumbs.map((crumb, idx) => (
        <div key={crumb.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span
            onClick={() => onNavigate(idx)}
            style={{
              cursor: 'pointer',
              color: 'var(--accent-purple)',
              textDecoration: 'underline',
            }}
          >
            {crumb.name}
          </span>
          {idx < breadcrumbs.length - 1 && (
            <span style={{ color: 'var(--text-muted)' }}>/</span>
          )}
        </div>
      ))}
    </div>
  );
};

interface Props {
  currentFolderId: string | null;
  breadcrumbs: Breadcrumb[];
  onBreadcrumbChange: (crumbs: Breadcrumb[]) => void;
}

export default function FolderTree({ currentFolderId, breadcrumbs, onBreadcrumbChange }: Props) {
  const dispatch = useDispatch();
  const [roots, setRoots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const expandedFolders = useSelector((s: RootState) => s.files.expandedFolders);

  useEffect(() => {
    loadRoots();
  }, []);

  const loadRoots = async () => {
  try {
    const f = await folderService.getFolders(null);
    const seen = new Set<string>();
    const unique = f.filter((folder: any) => {
      if (seen.has(folder.id)) return false;
      seen.add(folder.id);
      return true;
    });
    const root = f.length > 0 ? [f[0]] : [];
    setRoots(root);
  } catch (e) {
    toast.error('Failed to load folder tree');
  } finally {
    setLoading(false);
  }
};

  const handleSelect = (id: string, name: string) => {
    dispatch(setCurrentFolder(id));
    const existing = breadcrumbs.findIndex(b => b.id === id);
    if (existing >= 0) {
      onBreadcrumbChange(breadcrumbs.slice(0, existing + 1));
    } else {
      onBreadcrumbChange([...breadcrumbs, { id, name }]);
    }
  };

  const handleBreadcrumbNavigate = (index: number) => {
    const target = breadcrumbs[index];
    dispatch(setCurrentFolder(target.id));
    onBreadcrumbChange(breadcrumbs.slice(0, index + 1));
  };

  const handleToggleExpand = (folderId: string) => {
    dispatch(toggleFolderExpanded(folderId));
  };

  return (
    <div style={{ paddingBottom: 16 }}>
      {/* Navigation Header */}
      <div
        style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 1,
          marginBottom: 12,
        }}
      >
        Navigation
      </div>

      {/* Breadcrumb Trail */}
      {breadcrumbs.length > 1 && (
        <BreadcrumbTrail breadcrumbs={breadcrumbs} onNavigate={handleBreadcrumbNavigate} />
      )}

      {/* Loading State */}
      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Loading folders...</div>
      ) : roots.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>No folders yet</div>
      ) : (
        <div>
          {roots.map((folder) => (
            <FolderNode
              key={folder.id}
              folder={folder}
              parentId={null}
              onSelect={handleSelect}
              isActive={currentFolderId === folder.id}
              isExpanded={expandedFolders.includes(folder.id)}
              onToggleExpand={handleToggleExpand}
              breadcrumbs={breadcrumbs}
              onBreadcrumbChange={onBreadcrumbChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}