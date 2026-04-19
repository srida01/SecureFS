import { Response } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import { prisma } from '../../utils/prisma';
import { AppError } from '../../middleware/errorHandler';
import { createAuditLog } from '../../middleware/auditLogger';
import { storageService } from '../../services/storage.service';

export const uploadFile = async (req: AuthRequest, res: Response) => {
  if (!req.file) throw new AppError(400, 'No file provided');

  const { folderId } = req.body;
  if (!folderId) throw new AppError(400, 'folderId is required');

  // Check quota
  const quota = await prisma.storageQuota.findUnique({ where: { userId: req.userId } });
  if (!quota) throw new AppError(404, 'Storage quota not found');

  const fileSize = BigInt(req.file.size);
  if (quota.usedBytes + fileSize > quota.quotaBytes) {
    throw new AppError(400, 'Storage quota exceeded');
  }

  // Upload to storage
  const { key, checksum } = await storageService.uploadFile(
    req.file.buffer,
    req.file.originalname,
    req.file.mimetype
  );

  // Save to DB
  const file = await prisma.file.create({
    data: {
      ownerId: req.userId!,
      folderId,
      name: req.file.originalname,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      sizeBytes: fileSize,
      storageKey: key,
      checksumSha256: checksum,
    },
  });

  // Create initial version
  await prisma.fileVersion.create({
    data: {
      fileId: file.id,
      createdBy: req.userId!,
      versionNumber: 1,
      storageKey: key,
      sizeBytes: fileSize,
      checksumSha256: checksum,
    },
  });

  // Update quota
  await prisma.storageQuota.update({
    where: { userId: req.userId },
    data: { usedBytes: { increment: fileSize } },
  });

  await createAuditLog(req.userId!, 'upload', file.id, 'file', { name: file.name, size: file.sizeBytes });
  res.status(201).json({ success: true, data: file });
};

export const getFiles = async (req: AuthRequest, res: Response) => {
  const { folderId } = req.query;

  const files = await prisma.file.findMany({
    where: {
      ownerId: req.userId!,
      folderId: folderId ? String(folderId) : undefined,
      isDeleted: false,
    },
    orderBy: { name: 'asc' },
  });

  res.json({ success: true, data: files });
};

export const getFileById = async (req: AuthRequest, res: Response) => {
  const file = await prisma.file.findUnique({ where: { id: req.params.id } });
  if (!file || file.isDeleted) throw new AppError(404, 'File not found');
  const url = storageService.getFileUrl(file.storageKey);
  res.json({ success: true, data: { ...file, url } });
};

export const downloadFile = async (req: AuthRequest, res: Response) => {
  const file = await prisma.file.findUnique({ where: { id: req.params.id } });
  if (!file || file.isDeleted) throw new AppError(404, 'File not found');

  // Check permission
  if (file.ownerId !== req.userId) {
    const perm = await prisma.permission.findFirst({
      where: { resourceId: file.id, granteeUserId: req.userId, isActive: true },
    });
    if (!perm) throw new AppError(403, 'Access denied');
  }

  const url = storageService.getFileUrl(file.storageKey);
  await createAuditLog(req.userId!, 'download', file.id, 'file', { name: file.name });
  res.json({ success: true, data: { url, name: file.name, mimeType: file.mimeType } });
};

export const renameFile = async (req: AuthRequest, res: Response) => {
  const { name } = req.body;
  const file = await prisma.file.findUnique({ where: { id: req.params.id } });
  if (!file || file.ownerId !== req.userId) throw new AppError(403, 'Access denied');

  const updated = await prisma.file.update({ where: { id: req.params.id }, data: { name } });
  await createAuditLog(req.userId!, 'edit', file.id, 'file', { action: 'rename', oldName: file.name, newName: name });
  res.json({ success: true, data: updated });
};

export const deleteFile = async (req: AuthRequest, res: Response) => {
  const file = await prisma.file.findUnique({ where: { id: req.params.id } });
  if (!file || file.ownerId !== req.userId) throw new AppError(403, 'Access denied');

  await prisma.file.update({ where: { id: req.params.id }, data: { isDeleted: true } });
  await prisma.storageQuota.update({
    where: { userId: req.userId },
    data: { usedBytes: { decrement: file.sizeBytes } },
  });

  await createAuditLog(req.userId!, 'delete', file.id, 'file', { name: file.name });
  res.json({ success: true, message: 'File deleted' });
};

export const batchDeleteFiles = async (req: AuthRequest, res: Response) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) throw new AppError(400, 'Invalid ids array');

  // Verify ownership of all files
  const files = await prisma.file.findMany({
    where: { id: { in: ids }, ownerId: req.userId! },
  });

  if (files.length !== ids.length) throw new AppError(403, 'Access denied to some files');

  const totalSize = files.reduce((sum, f) => sum + f.sizeBytes, BigInt(0));

  // Mark all as deleted
  await prisma.file.updateMany({
    where: { id: { in: ids } },
    data: { isDeleted: true },
  });

  // Update quota
  await prisma.storageQuota.update({
    where: { userId: req.userId },
    data: { usedBytes: { decrement: totalSize } },
  });

  // Audit log
  await createAuditLog(req.userId!, 'delete', '', 'file', { count: ids.length });
  res.json({ success: true, message: `${ids.length} files deleted` });
};

export const getFileVersions = async (req: AuthRequest, res: Response) => {
  const { id: fileId } = req.params;
  const file = await prisma.file.findUnique({ where: { id: fileId } });
  if (!file) throw new AppError(404, 'File not found');

  // Check ownership or permission
  if (file.ownerId !== req.userId) {
    const perm = await prisma.permission.findFirst({
      where: { resourceId: fileId, granteeUserId: req.userId, isActive: true },
    });
    if (!perm) throw new AppError(403, 'Access denied');
  }

  const versions = await prisma.fileVersion.findMany({
    where: { fileId },
    include: { creator: { select: { id: true, clerkUserId: true } } },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: versions });
};

export const restoreFileVersion = async (req: AuthRequest, res: Response) => {
  const { id: fileId, versionId } = req.params;
  const file = await prisma.file.findUnique({ where: { id: fileId } });
  if (!file || file.ownerId !== req.userId) throw new AppError(403, 'Access denied');

  const version = await prisma.fileVersion.findUnique({ where: { id: versionId } });
  if (!version || version.fileId !== fileId) throw new AppError(404, 'Version not found');

  // Create new version from current file before restoring
  if (!file.isDeleted) {
    const latestVersion = await prisma.fileVersion.findFirst({
      where: { fileId },
      orderBy: { versionNumber: 'desc' },
    });

    const nextVersionNumber = (latestVersion?.versionNumber || 0) + 1;

    await prisma.fileVersion.create({
      data: {
        fileId,
        createdBy: req.userId!,
        versionNumber: nextVersionNumber,
        storageKey: file.storageKey,
        sizeBytes: file.sizeBytes,
        checksumSha256: file.checksumSha256,
      },
    });
  }

  // Restore version
  await prisma.file.update({
    where: { id: fileId },
    data: {
      storageKey: version.storageKey,
      sizeBytes: version.sizeBytes,
      checksumSha256: version.checksumSha256,
    },
  });

  await createAuditLog(req.userId!, 'restore', fileId, 'file', { versionId });
  res.json({ success: true, message: 'Version restored' });
};

export const downloadFileVersion = async (req: AuthRequest, res: Response) => {
  const { id: fileId, versionId } = req.params;
  const file = await prisma.file.findUnique({ where: { id: fileId } });
  if (!file) throw new AppError(404, 'File not found');

  // Check permission
  if (file.ownerId !== req.userId) {
    const perm = await prisma.permission.findFirst({
      where: { resourceId: fileId, granteeUserId: req.userId, isActive: true },
    });
    if (!perm) throw new AppError(403, 'Access denied');
  }

  const version = await prisma.fileVersion.findUnique({ where: { id: versionId } });
  if (!version || version.fileId !== fileId) throw new AppError(404, 'Version not found');

  const url = storageService.getFileUrl(version.storageKey);
  await createAuditLog(req.userId!, 'download', fileId, 'file', { versionId });
  res.json({ success: true, data: { url, name: file.name, mimeType: file.mimeType } });
};