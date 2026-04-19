import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import {
  createFolder,
  getFolders,
  getFolder,
  renameFolder,
  deleteFolder,
  restoreFolder,
  downloadFolder,
  getDeletedFolders,
  batchDeleteFolders,
} from './folder.controller';

export const folderRouter = Router();

folderRouter.use(authenticate);
folderRouter.post('/', createFolder);
folderRouter.post('/batch-delete', batchDeleteFolders);
folderRouter.get('/', getFolders);
folderRouter.get('/deleted', getDeletedFolders);
folderRouter.get('/:id', getFolder);
folderRouter.patch('/:id', renameFolder);
folderRouter.put('/:id/restore', restoreFolder);
folderRouter.get('/:id/download', downloadFolder);
folderRouter.delete('/:id', deleteFolder);