import React, { useEffect, useState } from 'react';
import { folderService } from '../services/fileService';

interface Props {
  currentFolderId: string | null;
  onSelect: (id: string) => void;
}

export default function FolderTree({ currentFolderId, onSelect }: Props) {
  const [roots, setRoots] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const f = await folderService.getFolders(null);
      setRoots(f);
    })();
  }, []);

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Navigation</div>
      {roots.map((f) => (
        <div
          key={f.id}
          onClick={() => onSelect(f.id)}
          style={{
            padding: '7px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 13,
            background: currentFolderId === f.id ? 'var(--accent-bg)' : 'transparent',
            color: currentFolderId === f.id ? 'var(--accent-purple)' : 'var(--text-secondary)',
            fontWeight: currentFolderId === f.id ? 600 : 400,
          }}
        >
          📁 {f.name}
        </div>
      ))}
    </div>
  );
}