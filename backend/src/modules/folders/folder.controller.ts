import { Response } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import { prisma } from '../../utils/prisma';
import { AppError } from '../../middleware/errorHandler';
import { createAuditLog } from '../../middleware/auditLogger';
import { v4 as uuidv4 } from 'uuid';

export const createFolder = async (req: AuthRequest, res: Response) => {
  const { name, parentFolderId } = req.body;
  if (!name) throw new AppError(400, 'Folder name is required');

  let depth = 0;
  let path = `/${name}`;

  if (parentFolderId) {
    const parent = await prisma.folder.findUnique({ where: { id: parentFolderId } });
    if (!parent) throw new AppError(404, 'Parent folder not found');
    depth = parent.depth + 1;
    path = `${parent.path}/${name}`;
  }

  const folder = await prisma.folder.create({
    data: {
      ownerId: req.userId!,
      parentFolderId: parentFolderId || null,
      name,
      path,
      depth,
    },
  });

  await createAuditLog(req.userId!, 'edit', folder.id, 'folder', { action: 'create', name });
  res.status(201).json({ success: true, data: folder });
};

export const getFolders = async (req: AuthRequest, res: Response) => {
  const { parentFolderId } = req.query;

  const folders = await prisma.folder.findMany({
    where: {
      ownerId: req.userId!,
      parentFolderId: parentFolderId ? String(parentFolderId) : null,
      isDeleted: false,
    },
    orderBy: { name: 'asc' },
  });

  res.json({ success: true, data: folders });
};

export const getFolder = async (req: AuthRequest, res: Response) => {
  const folder = await prisma.folder.findUnique({ where: { id: req.params.id } });
  if (!folder || folder.isDeleted) throw new AppError(404, 'Folder not found');
  res.json({ success: true, data: folder });
};

export const renameFolder = async (req: AuthRequest, res: Response) => {
  const { name } = req.body;
  const folder = await prisma.folder.findUnique({ where: { id: req.params.id } });

  if (!folder || folder.ownerId !== req.userId) throw new AppError(403, 'Access denied');

  const updated = await prisma.folder.update({
    where: { id: req.params.id },
    data: { name, updatedAt: new Date() },
  });

  await createAuditLog(req.userId!, 'edit', folder.id, 'folder', { action: 'rename', oldName: folder.name, newName: name });
  res.json({ success: true, data: updated });
};

export const deleteFolder = async (req: AuthRequest, res: Response) => {
  const folder = await prisma.folder.findUnique({ where: { id: req.params.id } });
  if (!folder || folder.ownerId !== req.userId) throw new AppError(403, 'Access denied');

  await prisma.folder.update({ where: { id: req.params.id }, data: { isDeleted: true } });
  await createAuditLog(req.userId!, 'delete', folder.id, 'folder', { name: folder.name });
  res.json({ success: true, message: 'Folder deleted' });
};

export const batchDeleteFolders = async (req: AuthRequest, res: Response) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) throw new AppError(400, 'Invalid ids array');

  // Verify ownership of all folders
  const folders = await prisma.folder.findMany({
    where: { id: { in: ids }, ownerId: req.userId! },
  });

  if (folders.length !== ids.length) throw new AppError(403, 'Access denied to some folders');

  // Mark all as deleted
  await prisma.folder.updateMany({
    where: { id: { in: ids } },
    data: { isDeleted: true },
  });

  // Audit log
  await createAuditLog(req.userId!, 'delete', '', 'folder', { count: ids.length });
  res.json({ success: true, message: `${ids.length} folders deleted` });
};