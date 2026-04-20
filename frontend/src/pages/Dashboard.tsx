import React, { useEffect, useState, useCallback } from 'react';
import { useAuth, useUser, UserButton } from '@clerk/clerk-react';
import { useDispatch, useSelector } from 'react-redux';
import { useDropzone } from 'react-dropzone';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { RootState } from '../store/store';
import { setUser } from '../store/authSlice';
import { setFiles, setFolders, setCurrentFolder } from '../store/fileSlice';
import { fileService, folderService } from '../services/fileService';
import api from '../services/api';
import StorageWidget from '../components/StorageWidget';
import FileGrid from '../components/FileGrid';
import FolderTree from '../components/FolderTree';
import ShareDialog from '../components/ShareDialog';
import AdvancedSearch from '../components/AdvancedSearch.tsx';

export default function Dashboard() {
  const { getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentFolderId, files, folders } = useSelector((s: RootState) => s.files);
  const quota = useSelector((s: RootState) => s.auth.quota);
  const userProfile = useSelector((s: RootState) => s.auth.user);

  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [shareTarget, setShareTarget] = useState<any>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [sharedReturnPath, setSharedReturnPath] = useState<string | null>(null);
  const [isViewingSharedItem, setIsViewingSharedItem] = useState(false);
  const [currentFolderPermission, setCurrentFolderPermission] = useState<string | null>(null);

  // Sync user on mount
  useEffect(() => {
    (async () => {
      const token = await getToken();
      const res = await api.post('/auth/sync', {}, { headers: { Authorization: `Bearer ${token}` } });
      dispatch(setUser(res.data.data));

      const foldersRes = await folderService.getFolders(null);

      // Support navigating here with a pre-selected folder (e.g. from SharedWithMe)
      const state = location.state as any;
      const targetFolderId = state?.folderId;
      const targetFileId = state?.fileId;
      
      // Check for pending share token from sign-in
      const pendingShareToken = localStorage.getItem('pendingShareToken');
      const pendingSharePassword = localStorage.getItem('pendingSharePassword');
      const pendingShareData = localStorage.getItem('pendingShareData');
      
      if (pendingShareToken) {
        // Clear the stored tokens
        localStorage.removeItem('pendingShareToken');
        localStorage.removeItem('pendingSharePassword');
        localStorage.removeItem('pendingShareData');
        
        // Claim access to the shared resource
        try {
          await api.post(`/share-links/${pendingShareToken}/claim`, {}, { 
            headers: { Authorization: `Bearer ${token}` } 
          });
          toast.success('Shared access granted!');
          
          // Navigate to the shared resource using stored data
          if (pendingShareData) {
            const shareData = JSON.parse(pendingShareData);
            setIsViewingSharedItem(true);
            if (shareData.shareLink.resourceType === 'file') {
              // For files, navigate to the folder containing the file and select it
              dispatch(setCurrentFolder(shareData.resource.folderId));
              setTimeout(() => setSelectedItems(new Set([shareData.resource.id])), 500);
            } else {
              // For folders, navigate directly to that folder
              dispatch(setCurrentFolder(shareData.resource.id));
            }
            return;
          }
        } catch (e: any) {
          toast.error('Failed to claim shared access');
        }
      }

      if (targetFileId) {
        // Find the folder containing this file and navigate to it
        try {
          const fileDetails = await fileService.getFile(targetFileId);
          dispatch(setCurrentFolder(fileDetails.folderId));
          // Select the file after contents load
          setTimeout(() => setSelectedItems(new Set([targetFileId])), 500);
          return;
        } catch (e) {
          toast.error('Could not access the shared file');
        }
      }

      if (targetFolderId) {
        dispatch(setCurrentFolder(targetFolderId));
        if (state?.fromSharedPage) setSharedReturnPath('/shared');
        return;
      }

      if (foldersRes.length === 0) {
        const root = await folderService.createFolder('My Files', null);
        dispatch(setCurrentFolder(root.id));
        setBreadcrumbs([{ id: root.id, name: root.name }]);
      } else {
        dispatch(setCurrentFolder(foldersRes[0].id));
        setBreadcrumbs([{ id: foldersRes[0].id, name: foldersRes[0].name }]);
      }
    })();
  }, []);

  // Load files & folders when currentFolderId changes
  useEffect(() => {
    if (!currentFolderId) return;
    setSelectedItems(new Set()); // Clear selection when navigating
    loadContents();
  }, [currentFolderId]);

  const loadContents = async () => {
    const [folder, files, subfolders] = await Promise.all([
      folderService.getFolder(currentFolderId!),
      fileService.getFiles(currentFolderId!),
      folderService.getFolders(currentFolderId),
    ]);

    setCurrentFolderPermission(folder.permissionLevel || 'owner');
    dispatch(setFiles(files));
    dispatch(setFolders(subfolders));
  };

  const navigateToFolder = (id: string, name: string) => {
    dispatch(setCurrentFolder(id));
    setBreadcrumbs((prev) => {
      const existing = prev.findIndex((b) => b.id === id);
      if (existing >= 0) return prev.slice(0, existing + 1);
      return [...prev, { id, name }];
    });
  };

  const navigateBreadcrumb = (id: string, index: number) => {
    dispatch(setCurrentFolder(id));
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!currentFolderId) return toast.error('Select a folder first');

    // Check if any files have relative paths (folder upload)
    const hasFolders = acceptedFiles.some(f => (f as any).webkitRelativePath);

    if (!hasFolders) {
      // Regular file upload
      for (const file of acceptedFiles) {
        try {
          await fileService.uploadFile(file, currentFolderId, (p: number) => {
            setUploadProgress((prev) => ({ ...prev, [file.name]: p }));
          });
          toast.success(`${file.name} uploaded`);
        } catch (e: any) {
          toast.error(e.response?.data?.message || `Failed to upload ${file.name}`);
        }
      }
    } else {
      // Folder upload
      const folderMap = new Map<string, string>(); // path -> folderId
      folderMap.set('', currentFolderId); // root

      // Collect all unique folder paths
      const folderPaths = new Set<string>();
      for (const file of acceptedFiles) {
        const path = (file as any).webkitRelativePath;
        if (path) {
          const parts = path.split('/').slice(0, -1); // exclude filename
          let currentPath = '';
          for (const part of parts) {
            currentPath += (currentPath ? '/' : '') + part;
            folderPaths.add(currentPath);
          }
        }
      }

      // Create folders in order
      const sortedPaths = Array.from(folderPaths).sort((a, b) => a.split('/').length - b.split('/').length);
      for (const path of sortedPaths) {
        const parts = path.split('/');
        const name = parts[parts.length - 1];
        const parentPath = parts.slice(0, -1).join('/');
        const parentId = folderMap.get(parentPath) || currentFolderId;
        try {
          const folder = await folderService.createFolder(name, parentId);
          folderMap.set(path, folder.id);
        } catch (e: any) {
          toast.error(`Failed to create folder ${name}`);
        }
      }

      // Upload files
      for (const file of acceptedFiles) {
        const path = (file as any).webkitRelativePath;
        const folderPath = path ? path.split('/').slice(0, -1).join('/') : '';
        const folderId = folderMap.get(folderPath) || currentFolderId;
        try {
          await fileService.uploadFile(file, folderId, (p: number) => {
            setUploadProgress((prev) => ({ ...prev, [file.name]: p }));
          });
          toast.success(`${file.name} uploaded`);
        } catch (e: any) {
          toast.error(e.response?.data?.message || `Failed to upload ${file.name}`);
        }
      }
    }

    setUploadProgress({});
    loadContents();
  }, [currentFolderId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, noClick: true });

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await folderService.createFolder(newFolderName, currentFolderId);
      toast.success('Folder created');
      setNewFolderName('');
      setShowNewFolder(false);
      loadContents();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to create folder');
    }
  };

  const handleDelete = async (type: 'file' | 'folder', id: string) => {
    try {
      if (type === 'file') await fileService.deleteFile(id);
      else await folderService.deleteFolder(id);
      toast.success(`${type === 'file' ? 'File' : 'Folder'} moved to trash`);
      loadContents();
    } catch {
      toast.error('Failed to move to trash');
    }
  };

  const handleBatchDelete = async (ids: string[], type: 'file' | 'folder') => {
    try {
      const token = await getToken();
      await api.post(
        `/${type}s/batch-delete`,
        { ids },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`${ids.length} ${type}(s) moved to trash`);
      setSelectedItems(new Set());
      loadContents();
    } catch {
      toast.error('Failed to move items to trash');
    }
  };

  const handleDownload = async (fileId: string, fileName: string) => {
    const { url } = await fileService.downloadFile(fileId);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
  };

  return (
    <div {...getRootProps()} style={{ display: 'flex', height: '100vh', background: 'var(--bg-page)', color: 'var(--text-primary)', fontFamily: 'system-ui, sans-serif' }}>
      <input {...getInputProps()} />

      {/* Sidebar */}
      <div style={{ width: 260, background: 'var(--surface)', padding: 20, display: 'flex', flexDirection: 'column', gap: 20, borderRight: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-lavender))', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18 }}>☁</div>
          <span style={{ fontWeight: 700, fontSize: 16 }}>CloudStore</span>
        </div>

        <StorageWidget quota={quota} />

        {/* Sidebar nav */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Navigation</div>
          <NavItem label="📁 My Files" active={location.pathname === '/'} onClick={() => navigate('/')} />
          <NavItem label="🔗 Shared with Me" active={location.pathname === '/shared'} onClick={() => navigate('/shared')} />
          <NavItem label="🔐 Shared by You" active={location.pathname === '/shared-by-me'} onClick={() => navigate('/shared-by-me')} />
          <NavItem label="🗑️ Trash" active={location.pathname === '/trash'} onClick={() => navigate('/trash')} />
          <NavItem label="⚙️ Settings" active={location.pathname === '/settings'} onClick={() => navigate('/settings')} />
          {userProfile?.role === 'admin' && (
            <NavItem label="🛡 Admin Panel" active={location.pathname === '/admin'} onClick={() => navigate('/admin')} />
          )}
        </div>

        

        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <UserButton />
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {clerkUser?.emailAddresses[0]?.emailAddress}
          </span>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center', background: 'var(--bg-page)' }}>
          {/* Breadcrumbs */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden' }}>
            {breadcrumbs.map((b, i) => (
              <React.Fragment key={b.id}>
                {i > 0 && <span style={{ color: 'var(--text-muted)', fontSize: 16 }}>›</span>}
                <button
                  onClick={() => navigateBreadcrumb(b.id, i)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: i === breadcrumbs.length - 1 ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: i === breadcrumbs.length - 1 ? 600 : 400,
                    fontSize: 14, padding: '2px 4px', borderRadius: 4,
                  }}
                >
                  {b.name}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Actions */}
          {isViewingSharedItem && (
            <button
              onClick={() => {
                setIsViewingSharedItem(false);
                navigate('/shared');
              }}
              style={headerBtn('var(--surface)', 'var(--text-primary)')}
            >
              ← Back to Shared with me
            </button>
          )}
          <button
            onClick={() => setShowSearch(true)}
            style={headerBtn('var(--elevated)', 'var(--text-secondary)')}
          >
            🔍 Search
          </button>
          {(currentFolderPermission === 'owner' || currentFolderPermission === 'edit' || currentFolderPermission === 'delete') && (
            <button
              onClick={() => setShowNewFolder(true)}
              style={headerBtn('var(--elevated)', 'var(--text-secondary)')}
            >
              + New Folder
            </button>
          )}
          {(currentFolderPermission === 'owner' || currentFolderPermission === 'edit' || currentFolderPermission === 'delete') && (
            <>
              <label style={{ ...headerBtn('var(--accent-purple)', 'var(--text-primary)'), cursor: 'pointer' }}>
                ↑ Upload Files
                <input type="file" multiple accept="*/*" style={{ display: 'none' }} onChange={(e) => e.target.files && onDrop(Array.from(e.target.files))} />
              </label>
              <label style={{ ...headerBtn('var(--accent-lavender)', 'var(--text-primary)'), cursor: 'pointer' }}>
                📁 Upload Folder
                <input type="file" multiple {...({ webkitdirectory: '' } as any)} style={{ display: 'none' }} onChange={(e) => e.target.files && onDrop(Array.from(e.target.files))} />
              </label>
            </>
          )}
        </div>

        {/* Drag overlay */}
        {isDragActive && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, fontSize: 24, fontWeight: 700, flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 64 }}>☁️</div>
            <div>Drop files or folders here to upload</div>
          </div>
        )}

        {/* Upload progress */}
        {Object.entries(uploadProgress).length > 0 && (
          <div style={{ padding: '8px 24px', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
            {Object.entries(uploadProgress).map(([name, pct]) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                <div style={{ flex: 1, background: 'var(--border)', borderRadius: 4, height: 4 }}>
                  <div style={{ width: `${pct}%`, background: 'var(--accent-purple)', height: 4, borderRadius: 4, transition: 'width 0.2s' }} />
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', width: 32, textAlign: 'right' }}>{pct}%</span>
              </div>
            ))}
          </div>
        )}

        {/* New folder input */}
        {showNewFolder && (
          <div style={{ padding: '8px 24px', background: 'var(--surface)', display: 'flex', gap: 8, borderBottom: '1px solid var(--border)' }}>
            <input
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') setShowNewFolder(false); }}
              placeholder="Folder name..."
              style={{ flex: 1, padding: '6px 12px', background: 'var(--bg-page)', border: '1px solid var(--accent-purple)', color: 'var(--text-primary)', borderRadius: 6, fontSize: 13 }}
            />
            <button onClick={createFolder} style={{ padding: '6px 14px', background: 'var(--accent-teal)', color: 'var(--text-primary)', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>Create</button>
            <button onClick={() => setShowNewFolder(false)} style={{ padding: '6px 14px', background: 'var(--text-muted)', color: 'var(--text-primary)', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
          </div>
        )}

        {/* File grid */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          <FileGrid
            folders={folders}
            files={files}
            onFolderClick={(id) => {
              const folder = folders.find((f) => f.id === id);
              navigateToFolder(id, folder?.name || 'Folder');
            }}
            onDelete={handleDelete}
            onBatchDelete={handleBatchDelete}
            onDownload={handleDownload}
            onShare={(item) => setShareTarget(item)}
            onRefresh={loadContents}
            selectedItems={selectedItems}
            onSelectionChange={setSelectedItems}
          canRename={currentFolderPermission === 'owner' || currentFolderPermission === 'edit' || currentFolderPermission === 'delete'}
          canDelete={currentFolderPermission === 'owner' || currentFolderPermission === 'delete'}
          />
        </div>
      </div>

      {/* Modals */}
      {shareTarget && (
        <ShareDialog resource={shareTarget} onClose={() => setShareTarget(null)} />
      )}
      {showSearch && (
        <AdvancedSearch
          onClose={() => setShowSearch(false)}
          onResultClick={(item, type) => {
            if (type === 'folder') {
              navigateToFolder(item.id, item.name);
            }
            setShowSearch(false);
          }}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function NavItem({ label, active, onClick }: { label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'block', width: '100%', textAlign: 'left', padding: '7px 10px',
        borderRadius: 6, cursor: 'pointer', fontSize: 13, border: 'none',
        background: active ? 'var(--accent-bg)' : 'transparent',
        color: active ? 'var(--accent-purple)' : 'var(--text-secondary)',
        fontWeight: active ? 600 : 400,
      }}
    >
      {label}
    </button>
  );
}

function headerBtn(bg: string, color: string): React.CSSProperties {
  return {
    padding: '7px 14px', background: bg, color, border: `1px solid var(--border)`,
    borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13,
    display: 'inline-flex', alignItems: 'center', gap: 6,
  };
}
