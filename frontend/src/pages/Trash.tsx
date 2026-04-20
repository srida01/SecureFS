import React, { useEffect, useState } from 'react';
import { useAuth, useUser, UserButton } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { trashService } from '../services/fileService';

interface TrashItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  deletedAt: string;
  deletedBy: string;
  sizeBytes?: number;
  ownerId: string;
}

export default function Trash() {
  const { getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const navigate = useNavigate();
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'type'>('date');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const items = await trashService.getTrashItems();
        setTrashItems(items || []);
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to load trash');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleRestore = async (id: string, type: 'file' | 'folder') => {
    try {
      if (type === 'file') {
        await trashService.restoreFile(id);
      } else {
        await trashService.restoreFolder(id);
      }
      setTrashItems((prev) => prev.filter((item) => item.id !== id));
      setSelectedItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      toast.success(`${type === 'file' ? 'File' : 'Folder'} restored successfully`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to restore item');
    }
  };

  const handlePermanentDelete = async (id: string, type: 'file' | 'folder') => {
    if (!confirm('Are you sure you want to permanently delete this item? This cannot be undone.')) {
      return;
    }

    try {
      if (type === 'file') {
        await trashService.hardDeleteFile(id);
      } else {
        await trashService.hardDeleteFolder(id);
      }
      setTrashItems((prev) => prev.filter((item) => item.id !== id));
      setSelectedItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      toast.success(`${type === 'file' ? 'File' : 'Folder'} permanently deleted`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete item');
    }
  };

  const handleBatchRestore = async () => {
    if (selectedItems.size === 0) {
      toast.error('No items selected');
      return;
    }

    try {
      let successCount = 0;
      for (const id of selectedItems) {
        const item = trashItems.find((i) => i.id === id);
        if (item) {
          try {
            await handleRestore(id, item.type);
            successCount++;
          } catch {
            // Error already handled in handleRestore
          }
        }
      }
      toast.success(`${successCount} items restored`);
    } catch (error: any) {
      toast.error('Failed to restore items');
    }
  };

  const handleBatchDelete = async () => {
    if (selectedItems.size === 0) {
      toast.error('No items selected');
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete ${selectedItems.size} item(s)? This cannot be undone.`)) {
      return;
    }

    try {
      let successCount = 0;
      for (const id of selectedItems) {
        const item = trashItems.find((i) => i.id === id);
        if (item) {
          try {
            await handlePermanentDelete(id, item.type);
            successCount++;
          } catch {
            // Error already handled in handlePermanentDelete
          }
        }
      }
      toast.success(`${successCount} items permanently deleted`);
    } catch (error: any) {
      toast.error('Failed to delete items');
    }
  };

  const handleEmptyTrash = async () => {
    if (trashItems.length === 0) {
      toast.error('Trash is already empty');
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete all ${trashItems.length} item(s) in trash? This cannot be undone.`)) {
      return;
    }

    try {
      await trashService.emptyTrash();
      setTrashItems([]);
      setSelectedItems(new Set());
      toast.success('Trash emptied successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to empty trash');
    }
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedItems);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedItems(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === trashItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(trashItems.map((item) => item.id)));
    }
  };

  const getSortedItems = () => {
    const sorted = [...trashItems];
    if (sortBy === 'date') {
      sorted.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
    } else if (sortBy === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'type') {
      sorted.sort((a, b) => a.type.localeCompare(b.type));
    }
    return sorted;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString() + ' ' + new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-page)' }}>
      {/* Sidebar */}
      <div style={{ flex: '0 0 250px', borderRight: '1px solid var(--border)', padding: '20px', background: 'var(--bg-page)', color: 'var(--text-primary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Trash</h1>
          <UserButton />
        </div>
        <div
          onClick={() => navigate('/')}
          style={{
            padding: '10px 15px',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14,
            background: 'transparent',
            color: 'var(--text-primary)',
            marginBottom: 10,
            border: 'none',
          }}
        >
          ← Back to Files
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: '30px', overflowY: 'auto' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ marginBottom: '30px' }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', margin: 0, marginBottom: 10 }}>🗑️ Trash</h2>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{trashItems.length} item(s) in trash</p>
          </div>

          {/* Action Bar */}
          {trashItems.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <button
                onClick={toggleSelectAll}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: '1px solid var(--border-light)',
                  background: selectedItems.size === trashItems.length ? 'var(--accent-purple)' : 'transparent',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {selectedItems.size === trashItems.length ? '✓ Deselect All' : 'Select All'}
              </button>

              {selectedItems.size > 0 && (
                <>
                  <button
                    onClick={handleBatchRestore}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 6,
                      border: '1px solid var(--accent-teal)',
                      background: 'var(--accent-teal)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    ↩️ Restore ({selectedItems.size})
                  </button>
                  <button
                    onClick={handleBatchDelete}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 6,
                      border: '1px solid var(--accent-coral)',
                      background: 'var(--accent-coral)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    🔥 Delete ({selectedItems.size})
                  </button>
                </>
              )}

              <button
                onClick={handleEmptyTrash}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: '1px solid var(--accent-lavender)',
                  background: 'var(--accent-lavender)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  marginLeft: 'auto',
                }}
              >
                🧹 Empty Trash
              </button>
            </div>
          )}

          {/* Sort Bar */}
          {trashItems.length > 0 && (
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Sort by:
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 4,
                    border: '1px solid var(--border-light)',
                    background: 'var(--surface)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  <option value="date">Deleted Date</option>
                  <option value="name">Name</option>
                  <option value="type">Type</option>
                </select>
              </label>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              <p>Loading trash...</p>
            </div>
          ) : trashItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 40px', background: 'var(--surface)', borderRadius: 8, color: 'var(--text-secondary)' }}>
              <p style={{ fontSize: 18, marginBottom: 10 }}>🗑️ Your trash is empty</p>
              <p>Deleted files and folders will appear here</p>
            </div>
          ) : (
            <div style={{ background: 'var(--surface)', borderRadius: 8, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '15px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 13 }}>
                      <input
                        type="checkbox"
                        checked={selectedItems.size === trashItems.length && trashItems.length > 0}
                        onChange={toggleSelectAll}
                        style={{ cursor: 'pointer', width: 16, height: 16 }}
                      />
                    </th>
                    <th style={{ padding: '15px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 13 }}>Name</th>
                    <th style={{ padding: '15px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 13 }}>Type</th>
                    <th style={{ padding: '15px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 13 }}>Size</th>
                    <th style={{ padding: '15px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 13 }}>Deleted</th>
                    <th style={{ padding: '15px', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 13 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {getSortedItems().map((item, idx) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'transparent' : 'var(--bg-page)' }}>
                      <td style={{ padding: '15px' }}>
                        <input
                          type="checkbox"
                          checked={selectedItems.has(item.id)}
                          onChange={() => toggleSelection(item.id)}
                          style={{ cursor: 'pointer', width: 16, height: 16 }}
                        />
                      </td>
                      <td style={{ padding: '15px', color: 'var(--text-primary)', fontSize: 13 }}>
                        <span style={{ marginRight: '8px' }}>{item.type === 'file' ? '📄' : '📁'}</span>
                        {item.name}
                      </td>
                      <td style={{ padding: '15px', color: 'var(--text-secondary)', fontSize: 13, textTransform: 'capitalize' }}>{item.type}</td>
                      <td style={{ padding: '15px', color: 'var(--text-secondary)', fontSize: 13 }}>{formatSize(item.sizeBytes)}</td>
                      <td style={{ padding: '15px', color: 'var(--text-secondary)', fontSize: 13 }}>{formatDate(item.deletedAt)}</td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleRestore(item.id, item.type)}
                          style={{
                            padding: '6px 12px',
                            marginRight: '6px',
                            borderRadius: 4,
                            border: 'none',
                            background: 'var(--accent-teal)',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          ↩️ Restore
                        </button>
                        <button
                          onClick={() => handlePermanentDelete(item.id, item.type)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 4,
                            border: 'none',
                            background: 'var(--accent-coral)',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          🔥 Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
