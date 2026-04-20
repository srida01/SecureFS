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

export default function SharedPage() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isSignedIn, getToken } = useAuth();
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState('');
  const [claimingAccess, setClaimingAccess] = useState(false);

  const password_query = searchParams.get('password');

 
  useEffect(() => {
    if (password_query) {
      setPassword(password_query);
    }
  }, [password_query]);

  // Handle automatic access claiming when user is signed in
  useEffect(() => {
    if (isSignedIn && token && shareData && !claimingAccess) {
      claimSharedAccess();
    }
  }, [isSignedIn, token, shareData, claimingAccess]);

  const claimSharedAccess = async () => {
    if (!token || !shareData) return;
    try {
      setClaimingAccess(true);
      const authToken = await getToken();
      
      // Claim access to the shared resource
      await api.post(`/share-links/${token}/claim`, {}, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      toast.success('Access granted! Opening shared item...');
      
      // Store share data for dashboard to handle
      localStorage.setItem('pendingShareToken', token);
      localStorage.setItem('pendingSharePassword', password);
      localStorage.setItem('pendingShareData', JSON.stringify(shareData));
      
      // Redirect to dashboard which will handle the navigation
      navigate('/', { replace: true });
    } catch (e: any) {
      console.error('Failed to claim shared access:', e);
      toast.error('Failed to claim access. Please try again.');
      setClaimingAccess(false);
    }
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

  if (!authenticated && error) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#1e293b', borderRadius: 12, padding: 40, width: 400, border: '1px solid #334155', textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0', marginBottom: 12 }}>🔒 Password Protected</div>
          <p style={{ color: '#94a3b8', marginBottom: 24, fontSize: 14 }}>{error}</p>
          <form onSubmit={handlePasswordSubmit}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', borderRadius: 6, marginBottom: 16, boxSizing: 'border-box' }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '10px 12px', background: loading ? '#94a3b8' : '#6366f1', color: '#fff', border: 'none', borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 500 }}
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
      <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, color: '#6366f1', marginBottom: 16 }}>⏳</div>
          <p style={{ color: '#94a3b8' }}>Loading shared resource...</p>
        </div>
      </div>
    );
  }

  if (!shareData) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#1e293b', borderRadius: 12, padding: 40, textAlign: 'center', border: '1px solid #334155' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0', marginBottom: 12 }}>❌ Not Found</div>
          <p style={{ color: '#94a3b8' }}>This share link is invalid, expired, or no longer available.</p>
        </div>
      </div>
    );
  }

  const isFile = shareData.resource.originalName !== undefined;
  const isExpired = shareData.shareLink.expiresAt && new Date(shareData.shareLink.expiresAt) < new Date();

  if (isExpired) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#1e293b', borderRadius: 12, padding: 40, textAlign: 'center', border: '1px solid #334155' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0', marginBottom: 12 }}>⏱️ Link Expired</div>
          <p style={{ color: '#94a3b8' }}>This share link has expired and is no longer accessible.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', padding: 40 }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid #334155', padding: 32 }}>
          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 14, color: '#94a3b8', marginBottom: 8 }}>
              {isFile ? '📄 File' : '📁 Folder'} shared with you
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#e2e8f0', marginBottom: 12 }}>{shareData.resource.name}</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>
              Shared by: <span style={{ color: '#94a3b8', fontWeight: 500 }}>{shareData.shareLink.creator.clerkUserId}</span>
            </div>
          </div>

          {/* Metadata */}
          <div style={{ background: '#0f172a', borderRadius: 8, padding: 16, marginBottom: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 13 }}>
              <div>
                <div style={{ color: '#94a3b8', marginBottom: 4 }}>Created</div>
                <div style={{ color: '#e2e8f0' }}>{new Date(shareData.resource.createdAt).toLocaleDateString()}</div>
              </div>
              {isFile && shareData.resource.sizeBytes !== undefined && (
                <div>
                  <div style={{ color: '#94a3b8', marginBottom: 4 }}>Size</div>
                  <div style={{ color: '#e2e8f0' }}>{formatFileSize(shareData.resource.sizeBytes)}</div>
                </div>
              )}
              {isFile && shareData.resource.mimeType && (
                <div>
                  <div style={{ color: '#94a3b8', marginBottom: 4 }}>Type</div>
                  <div style={{ color: '#e2e8f0' }}>{shareData.resource.mimeType}</div>
                </div>
              )}
              {shareData.shareLink.expiresAt && (
                <div>
                  <div style={{ color: '#94a3b8', marginBottom: 4 }}>Expires</div>
                  <div style={{ color: '#e2e8f0' }}>{new Date(shareData.shareLink.expiresAt).toLocaleDateString()}</div>
                </div>
              )}
            </div>
          </div>

          {/* Preview for text files */}
          {isFile && shareData.resource.mimeType?.startsWith('text/') && (
            <div style={{ background: '#0f172a', borderRadius: 8, padding: 16, marginBottom: 24, maxHeight: 400, overflowY: 'auto' }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>Preview:</div>
              <pre style={{ color: '#e2e8f0', fontSize: 12, margin: 0, fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                [File preview would load from storage]
              </pre>
            </div>
          )}

          {/* Preview for images */}
          {isFile && shareData.resource.mimeType?.startsWith('image/') && (
            <div style={{ background: '#0f172a', borderRadius: 8, padding: 16, marginBottom: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>Preview:</div>
              <div style={{ color: '#94a3b8' }}>[Image preview would display here]</div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 12 }}>
            {isFile && (
              <button
                onClick={downloadFile}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  background: '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: 14,
                }}
              >
                ⬇️ Download {shareData.resource.originalName || shareData.resource.name}
              </button>
            )}
            <button
              onClick={() => {
                // Store the share data for after sign-in
                localStorage.setItem('pendingShareToken', token!);
                localStorage.setItem('pendingSharePassword', password);
                if (shareData) {
                  localStorage.setItem('pendingShareData', JSON.stringify(shareData));
                }
                navigate('/sign-in');
              }}
              style={{
                flex: 1,
                padding: '12px 24px',
                background: '#6366f1',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: 14,
              }}
            >
              📱 Sign In to Get Full Access
            </button>
          </div>

          {/* Info */}
          <div style={{ marginTop: 24, padding: 12, background: '#0f172a', borderRadius: 8, fontSize: 12, color: '#64748b' }}>
            💡 Sign in with the application to save this {isFile ? 'file' : 'folder'} to your storage or get permanent access.
          </div>
        </div>
      </div>
    </div>
  );
}
