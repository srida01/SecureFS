import { prisma } from './prisma';
import { PermissionLevel, ResourceType } from '@prisma/client';

const permissionPriority: Record<PermissionLevel, number> = {
  view: 1,
  edit: 2,
  delete: 3,
  owner: 4,
};

export const getFolderAncestors = async (folderId: string) => {
  const folderIds: string[] = [];
  let current = await prisma.folder.findUnique({
    where: { id: folderId },
    select: { id: true, parentFolderId: true },
  });

  while (current) {
    folderIds.push(current.id);
    if (!current.parentFolderId) break;
    current = await prisma.folder.findUnique({
      where: { id: current.parentFolderId },
      select: { id: true, parentFolderId: true },
    });
  }

  return folderIds;
};

export const getEffectivePermission = async (
  userId: string,
  resourceId: string,
  resourceType: ResourceType
) => {
  const direct = await prisma.permission.findFirst({
    where: {
      granteeUserId: userId,
      resourceId,
      resourceType,
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
    },
    orderBy: { createdAt: 'desc' },
  });

  if (direct) return direct;

  if (resourceType === 'folder') {
    const ancestorFolderIds = await getFolderAncestors(resourceId);
    for (const folderId of ancestorFolderIds) {
      const perm = await prisma.permission.findFirst({
        where: {
          granteeUserId: userId,
          resourceId: folderId,
          resourceType: 'folder',
          isActive: true,
          OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
        },
        orderBy: { createdAt: 'desc' },
      });
      if (perm) return perm;
    }
    return null;
  }

  if (resourceType === 'file') {
    const file = await prisma.file.findUnique({ where: { id: resourceId }, select: { folderId: true } });
    if (!file) return null;
    return getEffectivePermission(userId, file.folderId, 'folder');
  }

  return null;
};

export const hasPermission = async (
  userId: string,
  resourceId: string,
  resourceType: ResourceType,
  requiredLevel: PermissionLevel
) => {
  const resource =
    resourceType === 'file'
      ? await prisma.file.findUnique({ where: { id: resourceId }, select: { ownerId: true } })
      : await prisma.folder.findUnique({ where: { id: resourceId }, select: { ownerId: true } });

  if (!resource) return false;
  if (resource.ownerId === userId) return true;

  const perm = await getEffectivePermission(userId, resourceId, resourceType);
  if (!perm) return false;
  return permissionPriority[perm.permissionLevel] >= permissionPriority[requiredLevel];
};
