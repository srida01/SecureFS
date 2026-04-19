import { Response } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import { prisma } from '../../utils/prisma';
import { AppError } from '../../middleware/errorHandler';
import { createAuditLog } from '../../middleware/auditLogger';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export const createShareLink = async (req: AuthRequest, res: Response) => {
  const { resourceId, resourceType, password, expiresAt } = req.body;

  if (!resourceId || !resourceType) {
    throw new AppError(400, 'resourceId and resourceType are required');
  }

  if (!['file', 'folder'].includes(resourceType)) {
    throw new AppError(400, 'Invalid resource type');
  }

  const resource =
    resourceType === 'file'
      ? await prisma.file.findUnique({ where: { id: resourceId } })
      : await prisma.folder.findUnique({ where: { id: resourceId } });

  if (!resource) {
    throw new AppError(404, 'Resource not found');
  }

  if (resource.ownerId !== req.userId) {
    throw new AppError(403, 'Access denied');
  }

  let expiresAtDate: Date | null = null;
  if (expiresAt) {
    expiresAtDate = new Date(expiresAt);
    if (Number.isNaN(expiresAtDate.getTime())) {
      throw new AppError(400, 'Invalid expiresAt value');
    }
  }

  const passwordHash = password
    ? await bcrypt.hash(String(password), 10)
    : null;

  const shareLink = await prisma.shareLink.create({
    data: {
      token: uuidv4(),
      resourceId,
      resourceType,
      createdBy: req.userId!,
      passwordHash: passwordHash || undefined,
      expiresAt: expiresAtDate,
    },
  });

  await createAuditLog(
    req.userId!,
    'share',
    resourceId,
    resourceType,
    {
      shareLinkId: shareLink.id,
      expiresAt: expiresAtDate?.toISOString(),
      protected: Boolean(password),
    }
  );

  res.status(201).json({
    success: true,
    data: {
      token: shareLink.token,
      resourceType: shareLink.resourceType,
      expiresAt: shareLink.expiresAt,
      isActive: shareLink.isActive,
      resourceId: shareLink.resourceId,
    },
  });
};

export const getShareLink = async (req: AuthRequest, res: Response) => {
  const { token } = req.params;
  const { password } = req.query;

  // 🔍 Find share link
  const link = await prisma.shareLink.findUnique({
    where: { token },
    include: {
      creator: {
        select: {
          id: true,
          clerkUserId: true,
        },
      },
    },
  });

  // ❌ Invalid / expired / inactive
  if (
    !link ||
    !link.isActive ||
    (link.expiresAt && link.expiresAt < new Date())
  ) {
    throw new AppError(404, 'Share link expired or invalid');
  }

  // 🔐 Password protection
  if (link.passwordHash) {
    if (!password) {
      throw new AppError(401, 'Password required to access this link');
    }

    const isValid = await bcrypt.compare(
      String(password),
      link.passwordHash
    );

    if (!isValid) {
      throw new AppError(401, 'Incorrect password');
    }
  }

  // 📦 Fetch actual resource
  const resource =
    link.resourceType === 'file'
      ? await prisma.file.findUnique({ where: { id: link.resourceId } })
      : await prisma.folder.findUnique({ where: { id: link.resourceId } });

  if (!resource) {
    throw new AppError(404, 'Shared resource not found');
  }

  // ✅ Response
  res.status(200).json({
    success: true,
    data: {
      shareLink: {
        token: link.token,
        resourceType: link.resourceType,
        expiresAt: link.expiresAt,
        creator: link.creator,
      },
      resource,
    },
  });
};