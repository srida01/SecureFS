import { Response } from 'express';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { AuthRequest } from '../../middleware/authenticate';
import { prisma } from '../../utils/prisma';
import { AppError } from '../../middleware/errorHandler';
import { createAuditLog } from '../../middleware/auditLogger';
import { getEffectivePermission, hasPermission } from '../../utils/accessControl';

export const createFolder = async (req: AuthRequest, res: Response) => {
  const { name, parentFolderId } = req.body;
  if (!name) throw new AppError(400, 'Folder name is required');

  let depth = 0;
  let folderPath = `/${name}`;

  if (parentFolderId) {
    const parent = await prisma.folder.findUnique({ where: { id: parentFolderId } });
    if (!parent || parent.isDeleted) throw new AppError(404, 'Parent folder not found');
    if (parent.ownerId !== req.userId) {
      const canEdit = await hasPermission(req.userId!, parent.id, 'folder', 'edit');
      if (!canEdit) throw new AppError(403, 'Access denied');
    }
    depth = parent.depth + 1;
    folderPath = `${parent.path}/${name}`;
  }

  const folder = await prisma.folder.create({
    data: {
      ownerId: req.userId!,
      parentFolderId: parentFolderId || null,
      name,
      path: folderPath,
      depth,
    },
  });

  await createAuditLog(req.userId!, 'edit', folder.id, 'folder', { action: 'create', name });
  res.status(201).json({ success: true, data: folder });
};

export const getFolders = async (req: AuthRequest, res: Response) => {
  const { parentFolderId } = req.query;

  if (parentFolderId) {
    const parentId = String(parentFolderId);
    const parent = await prisma.folder.findUnique({ where: { id: parentId } });
    if (!parent || parent.isDeleted) throw new AppError(404, 'Parent folder not found');
    if (parent.ownerId !== req.userId) {
      const canView = await hasPermission(req.userId!, parentId, 'folder', 'view');
      if (!canView) throw new AppError(403, 'Access denied');
    }

    const folders = await prisma.folder.findMany({
      where: {
        parentFolderId: parentId,
        isDeleted: false,
      },
      orderBy: { name: 'asc' },
    });

    res.json({ success: true, data: folders });
    return;
  }

  const folders = await prisma.folder.findMany({
    where: {
      ownerId: req.userId!,
      parentFolderId: null,
      isDeleted: false,
    },
    orderBy: { name: 'asc' },
  });

  res.json({ success: true, data: folders });
};

const buildFolderPath = (parentPath: string | null, name: string) => (parentPath ? `${parentPath}/${name}` : `/${name}`);

const updateFolderTree = async (
  folderId: string,
  parentPath: string | null,
  depth: number,
  updatedFields: Record<string, any> = {}
) => {
  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
    select: { id: true, name: true },
  });
  if (!folder) return;

  const folderName = updatedFields.name || folder.name;
  const folderPath = buildFolderPath(parentPath, folderName);

  await prisma.folder.update({
    where: { id: folderId },
    data: { ...updatedFields, path: folderPath, depth },
  });

  const children = await prisma.folder.findMany({ where: { parentFolderId: folderId }, select: { id: true } });
  for (const child of children) {
    await updateFolderTree(child.id, folderPath, depth + 1);
  }
};

const getDescendantFolderIds = async (folder: { id: string; path: string }) => {
  const children = await prisma.folder.findMany({
    where: {
      path: { startsWith: `${folder.path}/` },
    },
    select: { id: true },
  });
  return children.map((child) => child.id);
};

export const getFolder = async (req: AuthRequest, res: Response) => {
  const folder = await prisma.folder.findUnique({ where: { id: req.params.id } });
  if (!folder || folder.isDeleted) throw new AppError(404, 'Folder not found');

  if (folder.ownerId !== req.userId) {
    const canView = await hasPermission(req.userId!, folder.id, 'folder', 'view');
    if (!canView) throw new AppError(403, 'Access denied');

    const perm = await getEffectivePermission(req.userId!, folder.id, 'folder');
    res.json({
      success: true,
      data: {
        ...folder,
        permissionLevel: perm?.permissionLevel || 'view',
      },
    });
    return;
  }

  res.json({
    success: true,
    data: {
      ...folder,
      permissionLevel: 'owner',
    },
  });
};

export const renameFolder = async (req: AuthRequest, res: Response) => {
  const { name, parentFolderId } = req.body;
  const folder = await prisma.folder.findUnique({ where: { id: req.params.id } });
  if (!folder) throw new AppError(404, 'Folder not found');
  if (folder.ownerId !== req.userId) {
    const canEdit = await hasPermission(req.userId!, folder.id, 'folder', 'edit');
    if (!canEdit) throw new AppError(403, 'Access denied');
  }

  let parent = null;
  let depth = 0;
  if (parentFolderId) {
    parent = await prisma.folder.findUnique({ where: { id: parentFolderId } });
    if (!parent || parent.isDeleted) throw new AppError(404, 'New parent folder not found');
    if (parent.id === folder.id) throw new AppError(400, 'Cannot move folder into itself');
    depth = parent.depth + 1;
  }

  const updatedFields: Record<string, any> = {};
  if (name) updatedFields.name = name;
  if (req.body.hasOwnProperty('parentFolderId')) updatedFields.parentFolderId = parentFolderId || null;

  await updateFolderTree(folder.id, parent ? parent.path : null, depth, updatedFields);

  await createAuditLog(req.userId!, 'edit', folder.id, 'folder', {
    action: 'update',
    oldName: folder.name,
    newName: name || folder.name,
    newParentFolderId: parentFolderId || null,
  });

  const updated = await prisma.folder.findUnique({ where: { id: req.params.id } });
  res.json({ success: true, data: updated });
};

export const deleteFolder = async (req: AuthRequest, res: Response) => {
  const folder = await prisma.folder.findUnique({ where: { id: req.params.id } });
  if (!folder) throw new AppError(404, 'Folder not found');
  if (folder.ownerId !== req.userId) {
    const canDelete = await hasPermission(req.userId!, folder.id, 'folder', 'delete');
    if (!canDelete) throw new AppError(403, 'Access denied');
  }

  const descendantIds = await getDescendantFolderIds(folder);
  const allFolderIds = [folder.id, ...descendantIds];

  const filesToDelete = await prisma.file.findMany({
    where: {
      folderId: { in: allFolderIds },
      ownerId: req.userId!,
      isDeleted: false,
    },
    select: { id: true, sizeBytes: true },
  });
  const totalSize = filesToDelete.reduce((sum, f) => sum + f.sizeBytes, BigInt(0));

  await prisma.folder.updateMany({
    where: { id: { in: allFolderIds } },
    data: { isDeleted: true },
  });

  await prisma.file.updateMany({
    where: { folderId: { in: allFolderIds }, ownerId: req.userId! },
    data: { isDeleted: true },
  });

  await prisma.storageQuota.update({
    where: { userId: req.userId },
    data: { usedBytes: { decrement: totalSize } },
  });

  await createAuditLog(req.userId!, 'delete', folder.id, 'folder', { name: folder.name, deletedFiles: filesToDelete.length });
  res.json({ success: true, message: 'Folder deleted with contents moved to trash' });
};

export const restoreFolder = async (req: AuthRequest, res: Response) => {
  const folder = await prisma.folder.findUnique({ where: { id: req.params.id } });
  if (!folder || folder.ownerId !== req.userId) throw new AppError(403, 'Access denied');
  if (!folder.isDeleted) throw new AppError(400, 'Folder is not deleted');

  const descendantIds = await getDescendantFolderIds(folder);
  const allFolderIds = [folder.id, ...descendantIds];

  const filesToRestore = await prisma.file.findMany({
    where: {
      folderId: { in: allFolderIds },
      ownerId: req.userId!,
      isDeleted: true,
    },
    select: { id: true, sizeBytes: true },
  });
  const totalSize = filesToRestore.reduce((sum, f) => sum + f.sizeBytes, BigInt(0));

  await prisma.folder.updateMany({
    where: { id: { in: allFolderIds } },
    data: { isDeleted: false },
  });

  await prisma.file.updateMany({
    where: { folderId: { in: allFolderIds }, ownerId: req.userId! },
    data: { isDeleted: false },
  });

  await prisma.storageQuota.update({
    where: { userId: req.userId },
    data: { usedBytes: { increment: totalSize } },
  });

  await createAuditLog(req.userId!, 'edit', folder.id, 'folder', { action: 'restore', name: folder.name });
  res.json({ success: true, message: 'Folder restored' });
};

export const downloadFolder = async (req: AuthRequest, res: Response) => {
  const folder = await prisma.folder.findUnique({ where: { id: req.params.id } });
  if (!folder || folder.isDeleted) throw new AppError(404, 'Folder not found');

  if (folder.ownerId !== req.userId) {
    const canDownload = await hasPermission(req.userId!, folder.id, 'folder', 'view');
    if (!canDownload) throw new AppError(403, 'Access denied');
  }

  if (process.env.USE_LOCAL_STORAGE !== 'true') {
    throw new AppError(400, 'Folder download is supported only when local storage is enabled');
  }

  const storageRoot = process.env.LOCAL_UPLOAD_PATH || './uploads';
  const descendantIds = await getDescendantFolderIds(folder);
  const allFolderIds = [folder.id, ...descendantIds];
  const files = await prisma.file.findMany({
    where: { folderId: { in: allFolderIds }, isDeleted: false },
    include: { folder: { select: { path: true } } },
  });

  res.setHeader('Content-Disposition', `attachment; filename="${folder.name}.zip"`);
  res.setHeader('Content-Type', 'application/zip');

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err) => {
    throw err;
  });

  archive.pipe(res);

  for (const file of files) {
    const filePath = path.join(storageRoot, file.storageKey);
    if (fs.existsSync(filePath)) {
      const zipEntryName = `${file.folder.path.replace(/^\//, '')}/${file.name}`;
      archive.file(filePath, { name: zipEntryName });
    }
  }

  await archive.finalize();
};

export const getDeletedFolders = async (req: AuthRequest, res: Response) => {
  const folders = await prisma.folder.findMany({
    where: {
      ownerId: req.userId!,
      isDeleted: true,
    },
    orderBy: { updatedAt: 'desc' },
  });

  res.json({ success: true, data: folders });
};

export const batchDeleteFolders = async (req: AuthRequest, res: Response) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) throw new AppError(400, 'Invalid ids array');

  const folders = await prisma.folder.findMany({
    where: { id: { in: ids }, ownerId: req.userId! },
  });

  if (folders.length !== ids.length) throw new AppError(403, 'Access denied to some folders');

  await prisma.folder.updateMany({
    where: { id: { in: ids } },
    data: { isDeleted: true },
  });

  await createAuditLog(req.userId!, 'delete', '', 'folder', { count: ids.length });
  res.json({ success: true, message: `${ids.length} folders deleted` });
};
export const getFolderAuditLogs = async (req: AuthRequest, res: Response) => {
  const folder = await prisma.folder.findUnique({ where: { id: req.params.id } });

  if (!folder || folder.isDeleted) {
    throw new AppError(404, 'Folder not found');
  }

  if (folder.ownerId !== req.userId) {
    const perm = await prisma.permission.findFirst({
      where: {
        resourceId: folder.id,
        granteeUserId: req.userId,
        resourceType: 'folder',
      },
    });

    if (!perm) throw new AppError(403, 'Access denied');
  }

  // Get all audit logs for the folder
  const folderLogs = await prisma.auditLog.findMany({
    where: { resourceId: folder.id, resourceType: 'folder' },
    include: { actor: { select: { clerkUserId: true } } },
    orderBy: { createdAt: 'desc' },
  });

  // Recursive function to get all file IDs
  const getAllFiles = async (folderId: string): Promise<string[]> => {
    const files = await prisma.file.findMany({
      where: { folderId, isDeleted: false },
      select: { id: true },
    });

    const fileIds = files.map((f) => f.id);

    const childFolders = await prisma.folder.findMany({
      where: { parentFolderId: folderId, isDeleted: false },
      select: { id: true },
    });

    for (const child of childFolders) {
      const childFileIds = await getAllFiles(child.id);
      fileIds.push(...childFileIds);
    }

    return fileIds;
  };

  const allFileIds = await getAllFiles(folder.id);

  // Get file audit logs
  const fileLogs = await prisma.auditLog.findMany({
    where: {
      resourceId: { in: allFileIds },
      resourceType: 'file',
    },
    include: { actor: { select: { clerkUserId: true } } },
    orderBy: { createdAt: 'desc' },
  });

  // Combine and sort logs
  const allLogs = [...folderLogs, ...fileLogs].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  res.json({ success: true, data: allLogs });
};