import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface FolderTreeNode {
  id: string;
  name: string;
  isExpanded?: boolean;
}

interface FileState {
  currentFolderId: string | null;
  files: any[];
  folders: any[];
  folderTree: Record<string, FolderTreeNode[]>; // parentId -> folders cache
  expandedFolders: string[]; // Track which folders are expanded
  loading: boolean;
}

const initialState: FileState = {
  currentFolderId: null,
  files: [],
  folders: [],
  folderTree: {},
  expandedFolders: [],
  loading: false,
};

const fileSlice = createSlice({
  name: 'files',
  initialState,
  reducers: {
    setCurrentFolder(state, action: PayloadAction<string | null>) {
      state.currentFolderId = action.payload;
    },
    setFiles(state, action: PayloadAction<any[]>) {
      state.files = action.payload;
    },
    setFolders(state, action: PayloadAction<any[]>) {
      state.folders = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    // Optimistic update actions for folder operations
    addFolderOptimistic(state, action: PayloadAction<{ parentId: string | null; folder: any }>) {
      const { parentId, folder } = action.payload;
      const key = parentId || 'root';
      if (!state.folderTree[key]) {
        state.folderTree[key] = [];
      }
      state.folderTree[key].push(folder);
      // Also add to current folders if it's in the current directory
      if (parentId === state.currentFolderId) {
        state.folders.push(folder);
      }
    },
    removeFolderOptimistic(state, action: PayloadAction<{ folderId: string; parentId: string | null }>) {
      const { folderId, parentId } = action.payload;
      const key = parentId || 'root';
      if (state.folderTree[key]) {
        state.folderTree[key] = state.folderTree[key].filter(f => f.id !== folderId);
      }
      state.folders = state.folders.filter(f => f.id !== folderId);
    },
    renameFolderOptimistic(state, action: PayloadAction<{ folderId: string; newName: string }>) {
      const { folderId, newName } = action.payload;
      // Update in folder tree
      Object.values(state.folderTree).forEach(folders => {
        const folder = folders.find(f => f.id === folderId);
        if (folder) folder.name = newName;
      });
      // Update in current folders
      const current = state.folders.find(f => f.id === folderId);
      if (current) current.name = newName;
    },
    toggleFolderExpanded(state, action: PayloadAction<string>) {
      const folderId = action.payload;
      const index = state.expandedFolders.indexOf(folderId);
      if (index > -1) {
        state.expandedFolders.splice(index, 1);
      } else {
        state.expandedFolders.push(folderId);
      }
    },
    cacheFolderChildren(state, action: PayloadAction<{ parentId: string | null; children: any[] }>) {
      const key = action.payload.parentId || 'root';
      state.folderTree[key] = action.payload.children;
    },
  },
});

export const {
  setCurrentFolder,
  setFiles,
  setFolders,
  setLoading,
  addFolderOptimistic,
  removeFolderOptimistic,
  renameFolderOptimistic,
  toggleFolderExpanded,
  cacheFolderChildren,
} = fileSlice.actions;
export default fileSlice.reducer;