import api from './api';

export const fileService = {
  async getFiles(folderId?: string) {
    const res = await api.get('/files', {
      params: { folderId },
    });
    return res.data.data;
  },

  async uploadFile(file: File, folderId: string, onProgress?: (p: number) => void) {
    const form = new FormData();
    form.append('file', file);
    form.append('folderId', folderId);
    const res = await api.post('/files/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total));
      },
    });
    return res.data.data;
  },

  async deleteFile(id: string) {
    await api.delete(`/files/${id}`);
  },

  async downloadFile(id: string) {
    const res = await api.get(`/files/${id}/download`);
    return res.data.data;
  },

  async searchFiles(query: string) {
    const res = await api.get('/search', {
      params: { q: query },
    });
    return res.data.data;
  },
};

export const folderService = {
  async getFolders(parentFolderId?: string | null) {
    const res = await api.get('/folders', {
      params: { parentFolderId },
    });
    return res.data.data;
  },

  async createFolder(name: string, parentFolderId: string | null) {
    const res = await api.post('/folders', { name, parentFolderId });
    return res.data.data;
  },

  async getFolder(id: string) {
    const res = await api.get(`/folders/${id}`);
    return res.data.data;
  },

  async deleteFolder(id: string) {
    await api.delete(`/folders/${id}`);
  },
};