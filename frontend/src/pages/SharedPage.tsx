import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import api from '../services/api';

interface ShareData {
  shareLink: {
    token: string;
    resourceType: string;
    expiresAt: string | null;
    creator: {
      id: string;
      clerkUserId: string;
    };
  };
  resource: {
    id: string;
    name: string;
    originalName?: string;
    path?: string;
    storageKey?: string;
    mimeType?: string;
    sizeBytes?: number;
    createdAt: string;
  };
}

interface FolderContents {
  folder: {
    id: string;
    name: string;
    path: string;
    createdAt: string;
  };
  files: Array<{
    id: string;
    name: string;
    sizeBytes: number;
    mimeType: string;
    createdAt: string;
  }>;
  subfolders: Array<{
    id: string;
    name: string;
    path: string;
    createdAt: string;
  }>;
  breadcrumbs: Array<{ id: string; name: string }>;
  shareToken: string;
  sharedRootId: string;
}

export default function SharedPage() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isSignedIn, getToken } = useAuth();
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [folderContents, setFolderContents] = useState<FolderContents | null>(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState('');
  const [claimingAccess, setClaimingAccess] = useState(false);
  const [isBrowsing, setIsBrowsing] = useState(false);

  const password_query = searchParams.get('password');

  useEffect(() => {
    if (password_query) {
      setPassword(password_query);
    }
  }, [password_query]);

  // Handle automatic access claiming when user is signed in
  useEffect(() => {
    if (isSignedIn && token && shareData && !claimingAccess) {
      claimSharedAccessSilently();
    }
  }, [isSignedIn, token, shareData, claimingAccess]);

  const claimSharedAccessSilently = async () => {
    if (!token || !shareData) return;
    try {
      setClaimingAccess(true);
      const authToken = await getToken();
      
      await api.post(`/share-links/${token}/claim`, {}, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
    } catch (e: any) {
      console.error('Failed to claim shared access:', e);
    } finally {
      setClaimingAccess(false);
    }
  };

  const goToDashboard = () => {
    if (!token || !shareData) return;
    
    localStorage.setItem('pendingShareToken', token);
    localStorage.setItem('pendingSharePassword', password);
    localStorage.setItem('pendingShareData', JSON.stringify(shareData));
    
    navigate('/', { replace: true });
  };

  const fetchSharedResource = async (pwd?: string) => {
    if (!token) return;
    try {
      setLoading(true);
      setError('');
      const url = pwd ? `/share-links/${token}?password=${encodeURIComponent(pwd)}` : `/share-links/${token}`;
      const response = await api.get(url);
      setShareData(response.data.data);
      setAuthenticated(true);

      // If it's a folder, fetch contents
      if (response.data.data.shareLink.resourceType === 'folder') {
        fetchFolderContents(pwd);
        setIsBrowsing(true);
      }
      
      toast.success('Access granted!');
    } catch (e: any) {
      if (e.response?.status === 401) {
        setError('This link is password protected. Please enter the password.');
        setAuthenticated(false);
      } else {
        setError(e.response?.data?.message || 'Failed to access shared resource');
        toast.error(error);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchFolderContents = async (pwd?: string, folderId?: string) => {
    if (!token) return;
    try {
      let url = `/share-links/${token}/contents`;
      const params = new URLSearchParams();
      if (pwd) params.append('password', pwd);
      if (folderId) params.append('folderId', folderId);
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await api.get(url);
      setFolderContents(response.data.data);
    } catch (e: any) {
      console.error('Failed to fetch folder contents:', e);
      toast.error('Failed to load folder contents');
    }
  };

  const navigateToFolder = (folderId: string) => {
    fetchFolderContents(password, folderId);
  };

  useEffect(() => {
    fetchSharedResource(password_query || undefined);
  }, [token, password_query]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSharedResource(password);
  };

  const downloadFile = async () => {
    if (!shareData?.resource.storageKey) return;
    try {
      const response = await api.get(`/share-links/${token}/download?password=${encodeURIComponent(password)}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', shareData.resource.originalName || shareData.resource.name);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (e: any) {
      toast.error('Download failed');
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getMimeTypeIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎬';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📕';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📄';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
    return '📎';
  };

  if (!authenticated && error) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 40, width: '100%', maxWidth: 400, border: '1px solid var(--border)', textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>🔒 Password Protected</div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 14 }}>{error}</p>
          <form onSubmit={handlePasswordSubmit}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 6, marginBottom: 16, boxSizing: 'border-box' }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '10px 12px', background: loading ? 'var(--text-secondary)' : 'var(--accent-purple)', color: 'var(--text-primary)', border: 'none', borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 500 }}
            >
              {loading ? 'Accessing...' : 'Access'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, color: 'var(--accent-purple)', marginBottom: 16 }}>⏳</div>
          <p style={{ color: 'var(--text-secondary)' }}>Loading shared resource...</p>
        </div>
      </div>
    );
  }

  if (!shareData) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 40, textAlign: 'center', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>❌ Not Found</div>
          <p style={{ color: 'var(--text-secondary)' }}>This share link is invalid, expired, or no longer available.</p>
        </div>
      </div>
    );
  }

  const isFile = shareData.resource.originalName !== undefined;
  const isExpired = shareData.shareLink.expiresAt && new Date(shareData.shareLink.expiresAt) < new Date();

  if (isExpired) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 40, textAlign: 'center', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>⏱️ Link Expired</div>
          <p style={{ color: 'var(--text-secondary)' }}>This share link has expired and is no longer accessible.</p>
        </div>
      </div>
    );
  }

  // File view
  if (isFile) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-page)', padding: 40 }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: 32 }}>
            {/* Header */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8 }}>📄 File shared with you</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>{shareData.resource.name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Shared by: <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{shareData.shareLink.creator.clerkUserId}</span>
              </div>
            </div>

            {/* Metadata */}
            <div style={{ background: 'var(--bg-base)', borderRadius: 8, padding: 16, marginBottom: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 13 }}>
                <div>
                  <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>Created</div>
                  <div style={{ color: 'var(--text-primary)' }}>{new Date(shareData.resource.createdAt).toLocaleDateString()}</div>
                </div>
                {shareData.resource.sizeBytes !== undefined && (
                  <div>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>Size</div>
                    <div style={{ color: 'var(--text-primary)' }}>{formatFileSize(shareData.resource.sizeBytes)}</div>
                  </div>
                )}
                {shareData.resource.mimeType && (
                  <div>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>Type</div>
                    <div style={{ color: 'var(--text-primary)' }}>{shareData.resource.mimeType}</div>
                  </div>
                )}
                {shareData.shareLink.expiresAt && (
                  <div>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>Expires</div>
                    <div style={{ color: 'var(--text-primary)' }}>{new Date(shareData.shareLink.expiresAt).toLocaleDateString()}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                onClick={downloadFile}
                style={{
                  flex: '1 1 auto',
                  minWidth: 150,
                  padding: '12px 24px',
                  background: 'var(--accent-teal)',
                  color: 'var(--text-primary)',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: 14,
                }}
              >
                ⬇️ Download
              </button>
              
              {isSignedIn ? (
                <button
                  onClick={goToDashboard}
                  style={{
                    flex: '1 1 auto',
                    minWidth: 150,
                    padding: '12px 24px',
                    background: 'var(--accent-purple)',
                    color: 'var(--text-primary)',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontWeight: 500,
                    fontSize: 14,
                  }}
                >
                  🏠 Go to Dashboard
                </button>
              ) : (
                <button
                  onClick={() => {
                    localStorage.setItem('pendingShareToken', token!);
                    localStorage.setItem('pendingSharePassword', password);
                    if (shareData) {
                      localStorage.setItem('pendingShareData', JSON.stringify(shareData));
                    }
                    navigate('/sign-in');
                  }}
                  style={{
                    flex: '1 1 auto',
                    minWidth: 150,
                    padding: '12px 24px',
                    background: 'var(--accent-purple)',
                    color: 'var(--text-primary)',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontWeight: 500,
                    fontSize: 14,
                  }}
                >
                  📱 Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Folder browser view
  if (isBrowsing && folderContents) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-page)', padding: 20 }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          {/* Header with navigation */}
          <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>📁 Browsing Shared Folder</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{shareData.resource.name}</div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                {isSignedIn && (
                  <button
                    onClick={goToDashboard}
                    style={{
                      padding: '10px 20px',
                      background: 'var(--accent-purple)',
                      color: 'var(--text-primary)',
                      border: 'none',
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontWeight: 500,
                      fontSize: 14,
                    }}
                  >
                    🏠 Go to Dashboard
                  </button>
                )}
              </div>
            </div>

            {/* Breadcrumbs */}
            {folderContents.breadcrumbs && folderContents.breadcrumbs.length > 0 && (
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                {folderContents.breadcrumbs.map((crumb, idx) => (
                  <React.Fragment key={crumb.id}>
                    {idx > 0 && <span>/</span>}
                    <button
                      onClick={() => navigateToFolder(crumb.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: crumb.id === folderContents.folder.id ? 'var(--text-primary)' : 'var(--accent-purple)',
                        cursor: 'pointer',
                        fontWeight: crumb.id === folderContents.folder.id ? 600 : 400,
                        textDecoration: crumb.id === folderContents.folder.id ? 'none' : 'underline',
                      }}
                    >
                      {crumb.name}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>

          {/* Content */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 16 }}>
            {/* Subfolders */}
            {folderContents.subfolders.map((folder) => (
              <div
                key={folder.id}
                onClick={() => navigateToFolder(folder.id)}
                style={{
                  padding: 16,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-base)';
                  e.currentTarget.style.borderColor = 'var(--accent-purple)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--surface)';
                  e.currentTarget.style.borderColor = 'var(--border)';
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
                <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {folder.name}
                </div>
              </div>
            ))}

            {/* Files */}
            {folderContents.files.map((file) => (
              <div
                key={file.id}
                style={{
                  padding: 16,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>{getMimeTypeIcon(file.mimeType)}</div>
                <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {file.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>{formatFileSize(file.sizeBytes)}</div>
              </div>
            ))}
          </div>

          {/* Empty state */}
          {folderContents.subfolders.length === 0 && folderContents.files.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📂</div>
              <div style={{ color: 'var(--text-secondary)' }}>This folder is empty</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
