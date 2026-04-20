import { Response } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import { trashService } from './trash.service';
import { AppError } from '../../middleware/errorHandler';
import { createAuditLog } from '../../middleware/auditLogger';

/**
 * Get all trash items (files and folders) for the authenticated user
 */
export const getTrashItems = async (req: AuthRequest, res: Response) => {
  const items = await trashService.getTrashItems(req.userId!);
  res.json({ success: true, data: items });
};

/**
 * Get deleted files for the authenticated user
 */
export const getDeletedFiles = async (req: AuthRequest, res: Response) => {
  const files = await trashService.getDeletedFiles(req.userId!);
  res.json({ success: true, data: files });
};

/**
 * Get deleted folders for the authenticated user
 */
export const getDeletedFolders = async (req: AuthRequest, res: Response) => {
  const folders = await trashService.getDeletedFolders(req.userId!);
  res.json({ success: true, data: folders });
};

/**
 * Restore a file from trash
 */
export const restoreFile = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const file = await trashService.restoreFile(id, req.userId!);

  await createAuditLog(req.userId!, 'restore', id, 'file', {
    action: 'restore_from_trash',
    fileName: file.name,
  });

  res.json({
    success: true,
    message: 'File restored from trash',
    data: file,
  });
};

/**
 * Restore a folder from trash
 */
export const restoreFolder = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const folder = await trashService.restoreFolder(id, req.userId!);

  await createAuditLog(req.userId!, 'restore', id, 'folder', {
    action: 'restore_from_trash',
    folderName: folder.name,
  });

  res.json({
    success: true,
    message: 'Folder restored from trash',
    data: folder,
  });
};

/**
 * Permanently delete a file from trash (hard delete)
 */
export const hardDeleteFile = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  // Get file info before deletion for audit log
  const file = await trashService.getDeletedFiles(req.userId!).then((files) =>
    files.find((f) => f.id === id)
  );

  if (!file) throw new AppError(404, 'File not found in trash');

  const result = await trashService.hardDeleteFile(id, req.userId!);

  await createAuditLog(req.userId!, 'delete', id, 'file', {
    action: 'hard_delete_from_trash',
    fileName: file.name,
    sizeBytes: file.sizeBytes.toString(),
  });

  res.json(result);
};

/**
 * Permanently delete a folder and its contents from trash (hard delete)
 */
export const hardDeleteFolder = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  // Get folder info before deletion for audit log
  const folder = await trashService.getDeletedFolders(req.userId!).then((folders) =>
    folders.find((f) => f.id === id)
  );

  if (!folder) throw new AppError(404, 'Folder not found in trash');

  const result = await trashService.hardDeleteFolder(id, req.userId!);

  await createAuditLog(req.userId!, 'delete', id, 'folder', {
    action: 'hard_delete_from_trash',
    folderName: folder.name,
  });

  res.json(result);
};

/**
 * Permanently delete a trash item (file or folder)
 * Determines type from request or tries both
 */
export const hardDeleteItem = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { type } = req.query;

  if (type === 'file') {
    return hardDeleteFile(req, res);
  } else if (type === 'folder') {
    return hardDeleteFolder(req, res);
  } else {
    // Try to determine type automatically
    const deletedFiles = await trashService.getDeletedFiles(req.userId!);
    const deletedFolders = await trashService.getDeletedFolders(req.userId!);

    const isFile = deletedFiles.some((f) => f.id === id);
    const isFolder = deletedFolders.some((f) => f.id === id);

    if (isFile) {
      return hardDeleteFile(req, res);
    } else if (isFolder) {
      return hardDeleteFolder(req, res);
    } else {
      throw new AppError(404, 'Item not found in trash');
    }
  }
};

/**
 * Empty entire trash for the authenticated user
 */
export const emptyTrash = async (req: AuthRequest, res: Response) => {
  const result = await trashService.emptyTrash(req.userId!);

  await createAuditLog(req.userId!, 'delete', '', 'file', {
    action: 'empty_trash',
  });

  res.json(result);
};
