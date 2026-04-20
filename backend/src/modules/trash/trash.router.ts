import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import {
  getTrashItems,
  getDeletedFiles,
  getDeletedFolders,
  restoreFile,
  restoreFolder,
  hardDeleteFile,
  hardDeleteFolder,
  hardDeleteItem,
  emptyTrash,
} from './trash.controller';

export const trashRouter = Router();

// All routes require authentication
trashRouter.use(authenticate);

// Get trash items
trashRouter.get('/', getTrashItems);
trashRouter.get('/files', getDeletedFiles);
trashRouter.get('/folders', getDeletedFolders);

// Restore items from trash
trashRouter.post('/files/:id/restore', restoreFile);
trashRouter.post('/folders/:id/restore', restoreFolder);

// Delete items from trash (permanent deletion)
trashRouter.delete('/files/:id', hardDeleteFile);
trashRouter.delete('/folders/:id', hardDeleteFolder);
trashRouter.delete('/:id', hardDeleteItem);

// Empty entire trash
trashRouter.delete('/', emptyTrash);
