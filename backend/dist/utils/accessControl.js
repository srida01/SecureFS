"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasPermission = exports.getEffectivePermission = exports.getFolderAncestors = void 0;
const prisma_1 = require("./prisma");
const permissionPriority = {
    view: 1,
    edit: 2,
    delete: 3,
    owner: 4,
};
const getFolderAncestors = async (folderId) => {
    const folderIds = [];
    let current = await prisma_1.prisma.folder.findUnique({
        where: { id: folderId },
        select: { id: true, parentFolderId: true },
    });
    while (current) {
        folderIds.push(current.id);
        if (!current.parentFolderId)
            break;
        current = await prisma_1.prisma.folder.findUnique({
            where: { id: current.parentFolderId },
            select: { id: true, parentFolderId: true },
        });
    }
    return folderIds;
};
exports.getFolderAncestors = getFolderAncestors;
const getEffectivePermission = async (userId, resourceId, resourceType) => {
    const direct = await prisma_1.prisma.permission.findFirst({
        where: {
            granteeUserId: userId,
            resourceId,
            resourceType,
            isActive: true,
            OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
        },
        orderBy: { createdAt: 'desc' },
    });
    if (direct)
        return direct;
    if (resourceType === 'folder') {
        const ancestorFolderIds = await (0, exports.getFolderAncestors)(resourceId);
        for (const folderId of ancestorFolderIds) {
            const folder = await prisma_1.prisma.folder.findUnique({
                where: { id: folderId },
                select: { ownerId: true },
            });
            if (folder?.ownerId === userId) {
                return {
                    id: `${resourceId}-owner-fallback`,
                    grantedBy: userId,
                    granteeUserId: userId,
                    resourceId,
                    resourceType: 'folder',
                    permissionLevel: 'owner',
                    expiresAt: null,
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };
            }
            const perm = await prisma_1.prisma.permission.findFirst({
                where: {
                    granteeUserId: userId,
                    resourceId: folderId,
                    resourceType: 'folder',
                    isActive: true,
                    OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
                },
                orderBy: { createdAt: 'desc' },
            });
            if (perm)
                return perm;
        }
        return null;
    }
    if (resourceType === 'file') {
        const file = await prisma_1.prisma.file.findUnique({ where: { id: resourceId }, select: { folderId: true } });
        if (!file)
            return null;
        return (0, exports.getEffectivePermission)(userId, file.folderId, 'folder');
    }
    return null;
};
exports.getEffectivePermission = getEffectivePermission;
const hasPermission = async (userId, resourceId, resourceType, requiredLevel) => {
    const resource = resourceType === 'file'
        ? await prisma_1.prisma.file.findUnique({ where: { id: resourceId }, select: { ownerId: true } })
        : await prisma_1.prisma.folder.findUnique({ where: { id: resourceId }, select: { ownerId: true } });
    if (!resource)
        return false;
    if (resource.ownerId === userId)
        return true;
    const perm = await (0, exports.getEffectivePermission)(userId, resourceId, resourceType);
    if (!perm)
        return false;
    return permissionPriority[perm.permissionLevel] >= permissionPriority[requiredLevel];
};
exports.hasPermission = hasPermission;
//# sourceMappingURL=accessControl.js.map