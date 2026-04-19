import { Response } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import { prisma } from '../../utils/prisma';
import { AppError } from '../../middleware/errorHandler';
import { createAuditLog } from '../../middleware/auditLogger';

// ✅ SHARE RESOURCE (uses Clerk ID safely)
export const shareResource = async (req: AuthRequest, res: Response) => {
  const {
    granteeClerkUserId: rawGranteeClerkUserId,
    resourceId,
    resourceType,
    permissionLevel,
    expiresAt,
  } = req.body;

  const granteeClerkUserId = rawGranteeClerkUserId

  if (!req.userId) throw new AppError(401, 'Unauthorized');

  if (!granteeClerkUserId) {
    throw new AppError(400, 'granteeClerkUserId is required');
  }

  // 🔍 Resolve Clerk ID → DB user
  const granteeUser = await prisma.user.findUnique({
    where: { clerkUserId: granteeClerkUserId },
  });

  if (!granteeUser) {
    throw new AppError(404, 'User with this Clerk ID not found');
  }

  // 🚫 Prevent self-sharing
  if (granteeUser.id === req.userId) {
    throw new AppError(400, 'Cannot share resource with yourself');
  }

  // ✅ Create permission (FK safe)
  const perm = await prisma.permission.create({
    data: {
      grantedBy: req.userId,
      granteeUserId: granteeUser.id,
      resourceId,
      resourceType,
      permissionLevel,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  await createAuditLog(
    req.userId,
    'share',
    resourceId,
    resourceType,
    {
      granteeUserId: granteeUser.id,
      granteeClerkUserId,
      permissionLevel,
    }
  );

  res.status(201).json({ success: true, data: perm });
};

// ✅ REVOKE PERMISSION
export const revokePermission = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const perm = await prisma.permission.findUnique({
    where: { id: String(id) },
  });

  if (!perm || perm.grantedBy !== req.userId) {
    throw new AppError(403, 'Access denied');
  }

  await prisma.permission.update({
    where: { id: String(id) },
    data: { isActive: false },
  });

  res.json({ success: true, message: 'Permission revoked' });
};

export const updatePermission = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { permissionLevel, expiresAt } = req.body;

  const perm = await prisma.permission.findUnique({
    where: { id: String(id) },
  });

  if (!perm || perm.grantedBy !== req.userId || !perm.isActive) {
    throw new AppError(403, 'Access denied');
  }

  const data: any = {};
  if (permissionLevel) data.permissionLevel = permissionLevel;
  if (expiresAt !== undefined) data.expiresAt = expiresAt ? new Date(expiresAt) : null;

  const updated = await prisma.permission.update({
    where: { id: String(id) },
    data,
  });

  res.json({ success: true, data: updated });
};

export const getResourcePermissions = async (req: AuthRequest, res: Response) => {
  const { resourceId, resourceType } = req.query as { resourceId?: string; resourceType?: string };

  if (!req.userId) throw new AppError(401, 'Unauthorized');
  if (!resourceId || !resourceType) throw new AppError(400, 'resourceId and resourceType are required');
  if (!['file', 'folder'].includes(resourceType)) throw new AppError(400, 'Invalid resource type');

  const resource =
    resourceType === 'file'
      ? await prisma.file.findUnique({ where: { id: resourceId }, select: { ownerId: true } })
      : await prisma.folder.findUnique({ where: { id: resourceId }, select: { ownerId: true } });

  if (!resource) throw new AppError(404, 'Resource not found');
  if (resource.ownerId !== req.userId) throw new AppError(403, 'Access denied');

  const perms = await prisma.permission.findMany({
    where: {
      resourceId,
      resourceType: resourceType as any,
      isActive: true,
    },
    include: {
      grantee: {
        select: { id: true, clerkUserId: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: perms });
};

// ✅ GET RESOURCES SHARED WITH ME
export const getSharedWithMe = async (req: AuthRequest, res: Response) => {
  if (!req.userId) throw new AppError(401, 'Unauthorized');

  const perms = await prisma.permission.findMany({
    where: {
      granteeUserId: req.userId,
      isActive: true,
    },
    include: {
      granter: {
        select: { clerkUserId: true }
      }
    },
    orderBy: { createdAt: 'desc' },
  });

  // Fetch the actual resources (files/folders) for each permission
  const sharedItems = await Promise.all(
    perms.map(async (perm) => {
      let resource = null;
      if (perm.resourceType === 'file') {
        resource = await prisma.file.findUnique({
          where: { id: perm.resourceId, isDeleted: false },
        });
      } else if (perm.resourceType === 'folder') {
        resource = await prisma.folder.findUnique({
          where: { id: perm.resourceId, isDeleted: false },
        });
      }
      return {
        ...perm,
        file: perm.resourceType === 'file' ? resource : null,
        folder: perm.resourceType === 'folder' ? resource : null,
      };
    })
  );

  res.json({ success: true, data: sharedItems });
};

export const getSharedByMe = async (req: AuthRequest, res: Response) => {
  if (!req.userId) throw new AppError(401, 'Unauthorized');

  const perms = await prisma.permission.findMany({
    where: {
      grantedBy: req.userId,
      isActive: true,
    },
    include: {
      grantee: {
        select: { clerkUserId: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const sharedItems = await Promise.all(
    perms.map(async (perm) => {
      let resource = null;
      if (perm.resourceType === 'file') {
        resource = await prisma.file.findUnique({
          where: { id: perm.resourceId, isDeleted: false },
        });
      } else if (perm.resourceType === 'folder') {
        resource = await prisma.folder.findUnique({
          where: { id: perm.resourceId, isDeleted: false },
        });
      }
      return {
        ...perm,
        file: perm.resourceType === 'file' ? resource : null,
        folder: perm.resourceType === 'folder' ? resource : null,
      };
    })
  );

  res.json({ success: true, data: sharedItems });
};