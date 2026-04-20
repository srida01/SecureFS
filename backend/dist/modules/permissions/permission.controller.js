"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSharedByMe = exports.getSharedWithMe = exports.getResourcePermissions = exports.updatePermission = exports.revokePermission = exports.shareResource = void 0;
const prisma_1 = require("../../utils/prisma");
const errorHandler_1 = require("../../middleware/errorHandler");
const auditLogger_1 = require("../../middleware/auditLogger");
// ✅ SHARE RESOURCE (uses Clerk ID safely)
const shareResource = async (req, res) => {
    const { granteeClerkUserId: rawGranteeClerkUserId, resourceId, resourceType, permissionLevel, expiresAt, } = req.body;
    const granteeClerkUserId = rawGranteeClerkUserId;
    if (!req.userId)
        throw new errorHandler_1.AppError(401, 'Unauthorized');
    if (!granteeClerkUserId) {
        throw new errorHandler_1.AppError(400, 'granteeClerkUserId is required');
    }
    // 🔍 Resolve Clerk ID → DB user
    const granteeUser = await prisma_1.prisma.user.findUnique({
        where: { clerkUserId: granteeClerkUserId },
    });
    if (!granteeUser) {
        throw new errorHandler_1.AppError(404, 'User with this Clerk ID not found');
    }
    // 🚫 Prevent self-sharing
    if (granteeUser.id === req.userId) {
        throw new errorHandler_1.AppError(400, 'Cannot share resource with yourself');
    }
    // ✅ Create permission (FK safe)
    const perm = await prisma_1.prisma.permission.create({
        data: {
            grantedBy: req.userId,
            granteeUserId: granteeUser.id,
            resourceId,
            resourceType,
            permissionLevel,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
        },
    });
    await (0, auditLogger_1.createAuditLog)(req.userId, 'share', resourceId, resourceType, {
        granteeUserId: granteeUser.id,
        granteeClerkUserId,
        permissionLevel,
    });
    res.status(201).json({ success: true, data: perm });
};
exports.shareResource = shareResource;
// ✅ REVOKE PERMISSION
const revokePermission = async (req, res) => {
    const { id } = req.params;
    const perm = await prisma_1.prisma.permission.findUnique({
        where: { id: String(id) },
    });
    if (!perm || perm.grantedBy !== req.userId) {
        throw new errorHandler_1.AppError(403, 'Access denied');
    }
    await prisma_1.prisma.permission.update({
        where: { id: String(id) },
        data: { isActive: false },
    });
    res.json({ success: true, message: 'Permission revoked' });
};
exports.revokePermission = revokePermission;
const updatePermission = async (req, res) => {
    const { id } = req.params;
    const { permissionLevel, expiresAt } = req.body;
    const perm = await prisma_1.prisma.permission.findUnique({
        where: { id: String(id) },
    });
    if (!perm || perm.grantedBy !== req.userId || !perm.isActive) {
        throw new errorHandler_1.AppError(403, 'Access denied');
    }
    const data = {};
    if (permissionLevel)
        data.permissionLevel = permissionLevel;
    if (expiresAt !== undefined)
        data.expiresAt = expiresAt ? new Date(expiresAt) : null;
    const updated = await prisma_1.prisma.permission.update({
        where: { id: String(id) },
        data,
    });
    res.json({ success: true, data: updated });
};
exports.updatePermission = updatePermission;
const getResourcePermissions = async (req, res) => {
    const { resourceId, resourceType } = req.query;
    if (!req.userId)
        throw new errorHandler_1.AppError(401, 'Unauthorized');
    if (!resourceId || !resourceType)
        throw new errorHandler_1.AppError(400, 'resourceId and resourceType are required');
    if (!['file', 'folder'].includes(resourceType))
        throw new errorHandler_1.AppError(400, 'Invalid resource type');
    const resource = resourceType === 'file'
        ? await prisma_1.prisma.file.findUnique({ where: { id: resourceId }, select: { ownerId: true } })
        : await prisma_1.prisma.folder.findUnique({ where: { id: resourceId }, select: { ownerId: true } });
    if (!resource)
        throw new errorHandler_1.AppError(404, 'Resource not found');
    if (resource.ownerId !== req.userId)
        throw new errorHandler_1.AppError(403, 'Access denied');
    const perms = await prisma_1.prisma.permission.findMany({
        where: {
            resourceId,
            resourceType: resourceType,
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
exports.getResourcePermissions = getResourcePermissions;
// ✅ GET RESOURCES SHARED WITH ME
const getSharedWithMe = async (req, res) => {
    if (!req.userId)
        throw new errorHandler_1.AppError(401, 'Unauthorized');
    const perms = await prisma_1.prisma.permission.findMany({
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
    const sharedItems = await Promise.all(perms.map(async (perm) => {
        let resource = null;
        if (perm.resourceType === 'file') {
            resource = await prisma_1.prisma.file.findUnique({
                where: { id: perm.resourceId, isDeleted: false },
            });
        }
        else if (perm.resourceType === 'folder') {
            resource = await prisma_1.prisma.folder.findUnique({
                where: { id: perm.resourceId, isDeleted: false },
            });
        }
        return {
            ...perm,
            file: perm.resourceType === 'file' ? resource : null,
            folder: perm.resourceType === 'folder' ? resource : null,
        };
    }));
    res.json({ success: true, data: sharedItems });
};
exports.getSharedWithMe = getSharedWithMe;
const getSharedByMe = async (req, res) => {
    if (!req.userId)
        throw new errorHandler_1.AppError(401, 'Unauthorized');
    const perms = await prisma_1.prisma.permission.findMany({
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
    const sharedItems = await Promise.all(perms.map(async (perm) => {
        let resource = null;
        if (perm.resourceType === 'file') {
            resource = await prisma_1.prisma.file.findUnique({
                where: { id: perm.resourceId, isDeleted: false },
            });
        }
        else if (perm.resourceType === 'folder') {
            resource = await prisma_1.prisma.folder.findUnique({
                where: { id: perm.resourceId, isDeleted: false },
            });
        }
        return {
            ...perm,
            file: perm.resourceType === 'file' ? resource : null,
            folder: perm.resourceType === 'folder' ? resource : null,
        };
    }));
    res.json({ success: true, data: sharedItems });
};
exports.getSharedByMe = getSharedByMe;
//# sourceMappingURL=permission.controller.js.map