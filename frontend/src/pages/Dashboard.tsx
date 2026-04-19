import React, { useEffect, useState, useCallback } from 'react';
import { useUser, UserButton, useAuth } from '@clerk/clerk-react';
import { useDispatch, useSelector } from 'react-redux';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import type { RootState } from '../store/store';
import { setUser } from '../store/authSlice';
import { setFiles, setFolders, setCurrentFolder } from '../store/fileSlice';
import { fileService, folderService } from '../services/fileService';
import api from '../services/api';
import StorageWidget from '../components/StorageWidget.tsx';
import SearchBar from '../components/SearchBar.tsx';
import FileGrid from '../components/FileGrid.tsx';
import FolderTree from '../components/FolderTree.tsx';
import ShareDialog from '../components/ShareDialog.tsx';

export default function Dashboard() {
  const { getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const dispatch = useDispatch();
  const { currentFolderId, files, folders } = useSelector((s: RootState) => s.files);
  const quota = useSelector((s: RootState) => s.auth.quota);

  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [shareTarget, setShareTarget] = useState<any>(null);
  const [rootFolderId, setRootFolderId] = useState<string | null>(null);

  // Sync user on mount
  useEffect(() => {
    (async () => {
      const res = await api.post('/auth/sync', {});
      dispatch(setUser(res.data.data));

      // Get or create root folder
      const foldersRes = await folderService.getFolders(null);
      if (foldersRes.length === 0) {
        const root = await folderService.createFolder('My Files', null);
        setRootFolderId(root.id);
        dispatch(setCurrentFolder(root.id));
      } else {
        setRootFolderId(foldersRes[0].id);
        dispatch(setCurrentFolder(foldersRes[0].id));
      }
    })();
  }, []);

  // Load files & folders when currentFolderId changes
  useEffect(() => {
    if (!currentFolderId) return;
    loadContents();
  }, [currentFolderId]);

  const loadContents = async () => {
    const [f, d] = await Promise.all([
      fileService.getFiles(currentFolderId!),
      folderService.getFolders(currentFolderId),
    ]);
    dispatch(setFiles(f));
    dispatch(setFolders(d));
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!currentFolderId) return toast.error('Select a folder first');
    for (const file of acceptedFiles) {
      try {
        await fileService.uploadFile(file, currentFolderId, (p) => {
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
      toast.success(`${type} deleted`);
      loadContents();
    } catch {
      toast.error('Delete failed');
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
    <div {...getRootProps()} style={{ display: 'flex', height: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif' }}>
      <input {...getInputProps()} />

      {/* Sidebar */}
      <div style={{ width: 260, background: '#1e293b', padding: 20, display: 'flex', flexDirection: 'column', gap: 20, borderRight: '1px solid #334155' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>☁</div>
          <span style={{ fontWeight: 700, fontSize: 16 }}>CloudStore</span>
        </div>

        <StorageWidget quota={quota} />

        <FolderTree
          currentFolderId={currentFolderId}
          onSelect={(id) => dispatch(setCurrentFolder(id))}
        />

        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <UserButton />
          <span style={{ fontSize: 13, color: '#94a3b8' }}>{clerkUser?.emailAddresses[0]?.emailAddress}</span>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #1e293b', display: 'flex', gap: 16, alignItems: 'center' }}>
          <SearchBar />
          <button
            onClick={() => setShowNewFolder(true)}
            style={{ padding: '8px 16px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
          >
            + New Folder
          </button>
          <label
            style={{ padding: '8px 16px', background: '#0ea5e9', color: '#fff', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
          >
            ↑ Upload
            <input type="file" multiple style={{ display: 'none' }} onChange={(e) => e.target.files && onDrop(Array.from(e.target.files))} />
          </label>
        </div>

        {/* Drag overlay */}
        {isDragActive && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, fontSize: 24, fontWeight: 700 }}>
            Drop files here to upload
          </div>
        )}

        {/* Upload progress */}
        {Object.entries(uploadProgress).length > 0 && (
          <div style={{ padding: '8px 24px', background: '#1e293b' }}>
            {Object.entries(uploadProgress).map(([name, pct]) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: '#94a3b8', minWidth: 200 }}>{name}</span>
                <div style={{ flex: 1, background: '#334155', borderRadius: 4, height: 6 }}>
                  <div style={{ width: `${pct}%`, background: '#6366f1', height: 6, borderRadius: 4, transition: 'width 0.2s' }} />
                </div>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>{pct}%</span>
              </div>
            ))}
          </div>
        )}

        {/* New folder input */}
        {showNewFolder && (
          <div style={{ padding: '8px 24px', background: '#1e293b', display: 'flex', gap: 8 }}>
            <input
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createFolder()}
              placeholder="Folder name"
              style={{ flex: 1, padding: '6px 12px', background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', borderRadius: 6 }}
            />
            <button onClick={createFolder} style={{ padding: '6px 14px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Create</button>
            <button onClick={() => setShowNewFolder(false)} style={{ padding: '6px 14px', background: '#475569', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
          </div>
        )}

        {/* File grid */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          <FileGrid
            folders={folders}
            files={files}
            onFolderClick={(id) => dispatch(setCurrentFolder(id))}
            onDelete={handleDelete}
            onDownload={handleDownload}
            onShare={(item) => setShareTarget(item)}
          />
        </div>
      </div>

      {shareTarget && (
        <ShareDialog
          resource={shareTarget}
          onClose={() => setShareTarget(null)}
        />
      )}
    </div>
  );
}