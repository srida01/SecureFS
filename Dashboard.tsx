import React, { useEffect, useState, useCallback } from 'react';
import { useAuth, useUser, UserButton } from '@clerk/clerk-react';
import { useDispatch, useSelector } from 'react-redux';
import { useDropzone } from 'react-dropzone';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { RootState } from '../store/store';
import { setUser } from '../store/authSlice';
import { setFiles, setFolders, setCurrentFolder } from '../store/fileSlice';
import { fileService, folderService } from '../services/fileService';
import api from '../services/api';
import StorageWidget from '../components/StorageWidget';
import FileGrid from '../components/FileGrid';
import FolderTree from '../components/FolderTree';
import ShareDialog from '../components/ShareDialog';
import AdvancedSearch from '../components/AdvancedSearch';

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

  // Sync user on mount
  useEffect(() => {
    (async () => {
      const token = await getToken();
      const res = await api.post('/auth/sync', {}, { headers: { Authorization: `Bearer ${token}` } });
      dispatch(setUser(res.data.data));

      const foldersRes = await folderService.getFolders(null, token || undefined);

      // Support navigating here with a pre-selected folder (e.g. from SharedWithMe)
      const targetFolderId = (location.state as any)?.folderId;
      if (targetFolderId) {
        dispatch(setCurrentFolder(targetFolderId));
        return;
      }

      if (foldersRes.length === 0) {
        const root = await folderService.createFolder('My Files', null, token!);
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
    loadContents();
  }, [currentFolderId]);

  const loadContents = async () => {
    const token = await getToken();
    const [f, d] = await Promise.all([
      fileService.getFiles(currentFolderId!, token!),
      folderService.getFolders(currentFolderId, token!),
    ]);
    dispatch(setFiles(f));
    dispatch(setFolders(d));
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
    const token = await getToken();
    for (const file of acceptedFiles) {
      try {
        await fileService.uploadFile(file, currentFolderId, token!, (p) => {
          setUploadProgress((prev) => ({ ...prev, [file.name]: p }));
        });
        toast.success(`${file.name} uploaded`);
      } catch (e: any) {
        toast.error(e.response?.data?.message || `Failed to upload ${file.name}`);
      }
    }
    setUploadProgress({});
    loadContents();
  }, [currentFolderId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, noClick: true });

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    const token = await getToken();
    try {
      const folder = await folderService.createFolder(newFolderName, currentFolderId, token!);
      toast.success('Folder created');
      setNewFolderName('');
      setShowNewFolder(false);
      loadContents();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to create folder');
    }
  };

  const handleDelete = async (type: 'file' | 'folder', id: string) => {
    const token = await getToken();
    try {
      if (type === 'file') await fileService.deleteFile(id, token!);
      else await folderService.deleteFolder(id, token!);
      toast.success(`${type} deleted`);
      loadContents();
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleDownload = async (fileId: string, fileName: string) => {
    const token = await getToken();
    const { url } = await fileService.downloadFile(fileId, token!);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
  };

  return (
    <div {...getRootProps()} style={{ display: 'flex', height: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif' }}>
      <input {...getInputProps()} />

      {/* Sidebar */}
      <div style={{ width: 260, background: '#1e293b', padding: 20, display: 'flex', flexDirection: 'column', gap: 20, borderRight: '1px solid #334155', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18 }}>☁</div>
          <span style={{ fontWeight: 700, fontSize: 16 }}>CloudStore</span>
        </div>

        <StorageWidget quota={quota} />

        {/* Sidebar nav */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 10, color: '#334155', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Navigation</div>
          <NavItem label="📁 My Files" active onClick={() => {}} />
          <NavItem label="🔗 Shared with Me" onClick={() => navigate('/shared')} />
          <NavItem label="⚙️ Settings" onClick={() => navigate('/settings')} />
          {userProfile?.role === 'admin' && (
            <NavItem label="🛡 Admin Panel" onClick={() => navigate('/admin')} />
          )}
        </div>

        <FolderTree
          currentFolderId={currentFolderId}
          onSelect={(id) => dispatch(setCurrentFolder(id))}
        />

        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <UserButton />
          <span style={{ fontSize: 12, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {clerkUser?.emailAddresses[0]?.emailAddress}
          </span>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <div style={{ padding: '12px 24px', borderBottom: '1px solid #1e293b', display: 'flex', gap: 12, alignItems: 'center', background: '#0f172a' }}>
          {/* Breadcrumbs */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden' }}>
            {breadcrumbs.map((b, i) => (
              <React.Fragment key={b.id}>
                {i > 0 && <span style={{ color: '#334155', fontSize: 16 }}>›</span>}
                <button
                  onClick={() => navigateBreadcrumb(b.id, i)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: i === breadcrumbs.length - 1 ? '#e2e8f0' : '#475569',
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
          <button
            onClick={() => setShowSearch(true)}
            style={headerBtn('#1e293b', '#64748b')}
          >
            🔍 Search
          </button>
          <button
            onClick={() => setShowNewFolder(true)}
            style={headerBtn('#1e293b', '#64748b')}
          >
            + New Folder
          </button>
          <label style={{ ...headerBtn('#6366f1', '#fff'), cursor: 'pointer' }}>
            ↑ Upload
            <input type="file" multiple style={{ display: 'none' }} onChange={(e) => e.target.files && onDrop(Array.from(e.target.files))} />
          </label>
        </div>

        {/* Drag overlay */}
        {isDragActive && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, fontSize: 24, fontWeight: 700, flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 64 }}>☁️</div>
            <div>Drop files here to upload</div>
          </div>
        )}

        {/* Upload progress */}
        {Object.entries(uploadProgress).length > 0 && (
          <div style={{ padding: '8px 24px', background: '#1e293b', borderBottom: '1px solid #334155' }}>
            {Object.entries(uploadProgress).map(([name, pct]) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: '#94a3b8', minWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                <div style={{ flex: 1, background: '#334155', borderRadius: 4, height: 4 }}>
                  <div style={{ width: `${pct}%`, background: '#6366f1', height: 4, borderRadius: 4, transition: 'width 0.2s' }} />
                </div>
                <span style={{ fontSize: 11, color: '#64748b', width: 32, textAlign: 'right' }}>{pct}%</span>
              </div>
            ))}
          </div>
        )}

        {/* New folder input */}
        {showNewFolder && (
          <div style={{ padding: '8px 24px', background: '#1e293b', display: 'flex', gap: 8, borderBottom: '1px solid #334155' }}>
            <input
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') setShowNewFolder(false); }}
              placeholder="Folder name..."
              style={{ flex: 1, padding: '6px 12px', background: '#0f172a', border: '1px solid #6366f1', color: '#e2e8f0', borderRadius: 6, fontSize: 13 }}
            />
            <button onClick={createFolder} style={{ padding: '6px 14px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>Create</button>
            <button onClick={() => setShowNewFolder(false)} style={{ padding: '6px 14px', background: '#475569', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
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
            onDownload={handleDownload}
            onShare={(item) => setShareTarget(item)}
            onRefresh={loadContents}
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
        background: active ? '#6366f120' : 'transparent',
        color: active ? '#818cf8' : '#64748b',
        fontWeight: active ? 600 : 400,
      }}
    >
      {label}
    </button>
  );
}

function headerBtn(bg: string, color: string): React.CSSProperties {
  return {
    padding: '7px 14px', background: bg, color, border: `1px solid #334155`,
    borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13,
    display: 'inline-flex', alignItems: 'center', gap: 6,
  };
}
