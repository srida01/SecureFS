import { Response } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import { prisma } from '../../utils/prisma';

export const searchFiles = async (req: AuthRequest, res: Response) => {
  const { q, mimeType, minSize, maxSize, dateFrom, dateTo, tags, scope, folderId } = req.query;

  const tagList = tags
    ? String(tags).split(',').map((tag) => tag.trim()).filter(Boolean)
    : [];

  const useCurrentFolder = String(scope || '').toLowerCase() === 'currentfolder';

  const baseFileWhere: any = {
    isDeleted: false,
  };

  // 🔍 Name search (removed mode)
  if (q) {
    baseFileWhere.name = {
      contains: String(q),
    };
  }

  // 📄 Mime type filter
  if (mimeType) {
    baseFileWhere.mimeType = {
      contains: String(mimeType),
    };
  }

  // 📦 Size filters
  if (minSize) {
    baseFileWhere.sizeBytes = {
      ...(baseFileWhere.sizeBytes || {}),
      gte: BigInt(String(minSize)),
    };
  }

  if (maxSize) {
    baseFileWhere.sizeBytes = {
      ...(baseFileWhere.sizeBytes || {}),
      lte: BigInt(String(maxSize)),
    };
  }

  // 📅 Date filters
  if (dateFrom) {
    baseFileWhere.createdAt = {
      ...(baseFileWhere.createdAt || {}),
      gte: new Date(String(dateFrom)),
    };
  }

  if (dateTo) {
    baseFileWhere.createdAt = {
      ...(baseFileWhere.createdAt || {}),
      lte: new Date(String(dateTo)),
    };
  }

  // 🏷️ Tag filter (removed mode)
  if (tagList.length > 0) {
    baseFileWhere.tags = {
      some: {
        name: {
          in: tagList,
        },
      },
    };
  }

  // 📁 Folder scope
  if (useCurrentFolder && folderId) {
    baseFileWhere.folderId = String(folderId);
  }

  // Get owned files
  const ownedFiles = await prisma.file.findMany({
    where: {
      ...baseFileWhere,
      ownerId: req.userId!,
    },
    include: { tags: true },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  });

  // Get shared files via permissions
  const sharedPermissions = await prisma.permission.findMany({
    where: {
      granteeUserId: req.userId!,
      resourceType: 'file',
      isActive: true,
    },
    select: { resourceId: true },
  });

  const sharedFileIds = sharedPermissions.map(p => p.resourceId);

  const sharedFiles = await prisma.file.findMany({
    where: {
      ...baseFileWhere,
      id: { in: sharedFileIds },
    },
    include: { tags: true },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  });

  // Combine and deduplicate
  const allFiles = [...ownedFiles, ...sharedFiles];
  const uniqueFiles = allFiles.filter((file, index, self) => 
    self.findIndex(f => f.id === file.id) === index
  ).slice(0, 50);

  // 📁 Folder search (owned folders only for now)
  const folderWhere: any = {
    ownerId: req.userId!,
    isDeleted: false,
  };

  if (q) {
    folderWhere.name = {
      contains: String(q),
    };
  }

  if (useCurrentFolder && folderId) {
    folderWhere.parentFolderId = String(folderId);
  }

  const folders = await prisma.folder.findMany({
    where: folderWhere,
    take: 20,
  });

  res.json({ success: true, data: { files: uniqueFiles, folders } });
};