import { Response } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import { prisma } from '../../utils/prisma';
import { AppError } from '../../middleware/errorHandler';
import { createAuditLog } from '../../middleware/auditLogger';

export const addTag = async (req: AuthRequest, res: Response) => {
  const { fileId } = req.params;
  const { key, name, value } = req.body;

  if (!name || !name.trim()) {
    throw new AppError(400, 'Tag name is required');
  }

  // Verify file ownership
  const file = await prisma.file.findUnique({ where: { id: fileId } });
  if (!file || file.isDeleted) throw new AppError(404, 'File not found');
  if (file.ownerId !== req.userId) throw new AppError(403, 'Access denied');

  // Check if tag already exists
  const existing = await prisma.tag.findFirst({
    where: {
      fileId,
      name: name.trim(),
    },
  });

  if (existing) {
    throw new AppError(400, 'Tag already exists for this file');
  }

  const tag = await prisma.tag.create({
    data: {
      fileId,
      key: key || null,
      name: name.trim(),
      value: value || null,
    },
  });

  await createAuditLog(req.userId!, 'edit', fileId, 'file', { action: 'add_tag', tagName: name });
  res.status(201).json({ success: true, data: tag });
};

export const getFileTags = async (req: AuthRequest, res: Response) => {
  const { fileId } = req.params;

  const file = await prisma.file.findUnique({ where: { id: req.params.fileId } });
  if (!file || file.isDeleted) throw new AppError(404, 'File not found');

  // Check access
  if (file.ownerId !== req.userId) {
    const perm = await prisma.permission.findFirst({
      where: { resourceId: fileId, granteeUserId: req.userId, isActive: true },
    });
    if (!perm) throw new AppError(403, 'Access denied');
  }

  const tags = await prisma.tag.findMany({
    where: { fileId },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: tags });
};

export const updateTag = async (req: AuthRequest, res: Response) => {
  const { fileId, tagId } = req.params;
  const { key, name, value } = req.body;

  const tag = await prisma.tag.findUnique({ where: { id: tagId } });
  if (!tag || tag.fileId !== fileId) throw new AppError(404, 'Tag not found');

  const file = await prisma.file.findUnique({ where: { id: fileId } });
  if (!file || file.ownerId !== req.userId) throw new AppError(403, 'Access denied');

  const updated = await prisma.tag.update({
    where: { id: tagId },
    data: {
      key: key !== undefined ? key : undefined,
      name: name !== undefined ? name.trim() : undefined,
      value: value !== undefined ? value : undefined,
    },
  });

  await createAuditLog(req.userId!, 'edit', fileId, 'file', { action: 'update_tag', tagId, oldTag: tag, newTag: updated });
  res.json({ success: true, data: updated });
};

export const removeTag = async (req: AuthRequest, res: Response) => {
  const { fileId, tagId } = req.params;

  const tag = await prisma.tag.findUnique({ where: { id: tagId } });
  if (!tag || tag.fileId !== fileId) throw new AppError(404, 'Tag not found');

  const file = await prisma.file.findUnique({ where: { id: fileId } });
  if (!file || file.ownerId !== req.userId) throw new AppError(403, 'Access denied');

  await prisma.tag.delete({ where: { id: tagId } });

  await createAuditLog(req.userId!, 'edit', fileId, 'file', { action: 'remove_tag', tagName: tag.name });
  res.json({ success: true, message: 'Tag removed' });
};
