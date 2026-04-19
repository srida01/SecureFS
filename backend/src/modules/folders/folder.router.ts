import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import {
  createFolder, getFolders, renameFolder,
  deleteFolder, getFolder, batchDeleteFolders
} from './folder.controller';

export const folderRouter = Router();

folderRouter.use(authenticate);
folderRouter.post('/', createFolder);
folderRouter.post('/batch-delete', batchDeleteFolders);
folderRouter.get('/', getFolders);
folderRouter.get('/:id', getFolder);
folderRouter.patch('/:id', renameFolder);
folderRouter.delete('/:id', deleteFolder);