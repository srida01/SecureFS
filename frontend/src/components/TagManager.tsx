import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { tagService } from '../services/fileService';

interface Tag {
  id: string;
  name: string;
  key?: string;
  value?: string;
}

interface Props {
  fileId: string;
  fileName: string;
  onClose: () => void;
}

export default function TagManager({ fileId, fileName, onClose }: Props) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [newTagKey, setNewTagKey] = useState('');
  const [newTagValue, setNewTagValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadTags();
  }, [fileId]);

  const loadTags = async () => {
    try {
      setLoading(true);
      const data = await tagService.getFileTags(fileId);
      setTags(data || []);
    } catch (error) {
      toast.error('Failed to load tags');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) {
      toast.error('Tag name is required');
      return;
    }

    try {
      const tag = await tagService.addTag(fileId, newTagName, newTagKey || undefined, newTagValue || undefined);
      setTags([...tags, tag]);
      setNewTagName('');
      setNewTagKey('');
      setNewTagValue('');
      toast.success('Tag added');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add tag');
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    try {
      await tagService.removeTag(fileId, tagId);
      setTags(tags.filter(t => t.id !== tagId));
      toast.success('Tag removed');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to remove tag');
    }
  };

  const handleUpdateTag = async (tagId: string, name: string) => {
    try {
      await tagService.updateTag(fileId, tagId, name);
      setTags(tags.map(t => t.id === tagId ? { ...t, name } : t));
      setEditingId(null);
      toast.success('Tag updated');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update tag');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#0f172a',
          borderRadius: 12,
          border: '1px solid #334155',
          maxWidth: 500,
          width: '90%',
          maxHeight: '80vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: 20,
            borderBottom: '1px solid #334155',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 style={{ margin: 0, color: '#e2e8f0', fontSize: 18, fontWeight: 600 }}>
            🏷️ Manage Tags: {fileName}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: 24,
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Add Tag Form */}
          <form onSubmit={handleAddTag}>
            <div style={{ background: '#1e293b', padding: 16, borderRadius: 8, border: '1px solid #334155' }}>
              <h3 style={{ margin: '0 0 12px 0', color: '#cbd5e1', fontSize: 14, fontWeight: 600 }}>
                Add New Tag
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input
                  type="text"
                  placeholder="Tag name (required)"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 6,
                    color: '#e2e8f0',
                    fontSize: 13,
                  }}
                />
                <input
                  type="text"
                  placeholder="Tag key (optional)"
                  value={newTagKey}
                  onChange={(e) => setNewTagKey(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 6,
                    color: '#e2e8f0',
                    fontSize: 13,
                  }}
                />
                <input
                  type="text"
                  placeholder="Tag value (optional)"
                  value={newTagValue}
                  onChange={(e) => setNewTagValue(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 6,
                    color: '#e2e8f0',
                    fontSize: 13,
                  }}
                />
                <button
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    background: '#6366f1',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 13,
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = '#4f46e5';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = '#6366f1';
                  }}
                >
                  + Add Tag
                </button>
              </div>
            </div>
          </form>

          {/* Tags List */}
          <div>
            <h3 style={{ margin: '0 0 12px 0', color: '#cbd5e1', fontSize: 14, fontWeight: 600 }}>
              Current Tags ({tags.length})
            </h3>
            {loading ? (
              <div style={{ color: '#94a3b8', textAlign: 'center', padding: 20 }}>
                ⏳ Loading tags...
              </div>
            ) : tags.length === 0 ? (
              <div style={{ color: '#64748b', textAlign: 'center', padding: 20 }}>
                No tags yet. Add one above!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    style={{
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: 8,
                      padding: 12,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      {editingId === tag.id ? (
                        <input
                          autoFocus
                          type="text"
                          value={tag.name}
                          onChange={(e) =>
                            setTags(tags.map(t => t.id === tag.id ? { ...t, name: e.target.value } : t))
                          }
                          onBlur={() => handleUpdateTag(tag.id, tag.name)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdateTag(tag.id, tag.name);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          style={{
                            padding: '6px 10px',
                            background: '#0f172a',
                            border: '1px solid #6366f1',
                            borderRadius: 4,
                            color: '#e2e8f0',
                            width: '100%',
                            fontSize: 13,
                          }}
                        />
                      ) : (
                        <div>
                          <div
                            onClick={() => setEditingId(tag.id)}
                            style={{
                              fontSize: 13,
                              color: '#e2e8f0',
                              fontWeight: 500,
                              cursor: 'pointer',
                              padding: '4px 0',
                            }}
                          >
                            {tag.name}
                          </div>
                          {tag.key && (
                            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                              Key: {tag.key}
                            </div>
                          )}
                          {tag.value && (
                            <div style={{ fontSize: 12, color: '#94a3b8' }}>
                              Value: {tag.value}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveTag(tag.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: 18,
                        padding: '0 8px',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: 16,
            borderTop: '1px solid #334155',
            textAlign: 'right',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: '#334155',
              border: 'none',
              borderRadius: 6,
              color: '#e2e8f0',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#475569';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#334155';
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
