import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../../middleware/authenticate';
import {
  uploadFile,
  getFiles,
  downloadFile,
  deleteFile,
  renameFile,
  getFileById,
  batchDeleteFiles,
  getFileVersions,
  restoreFileVersion,
  downloadFileVersion,
  restoreFile,
  getDeletedFiles,
  getFileAuditLogs
} from './file.controller';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } }); // 500MB

export const fileRouter = Router();

fileRouter.use(authenticate);
fileRouter.post('/upload', upload.single('file'), uploadFile);
fileRouter.post('/batch-delete', batchDeleteFiles);
fileRouter.get('/trash', getDeletedFiles);
fileRouter.get('/', getFiles);
fileRouter.get('/:id', getFileById);
fileRouter.get('/:id/download', downloadFile);
fileRouter.get('/:id/versions', getFileVersions);
fileRouter.get('/:id/versions/:versionId/download', downloadFileVersion);
fileRouter.post('/:id/versions/:versionId/restore', restoreFileVersion);
fileRouter.get('/:id/audit-logs', getFileAuditLogs);
fileRouter.patch('/:id', renameFile);
fileRouter.patch('/:id/restore', restoreFile);
fileRouter.delete('/:id', deleteFile);