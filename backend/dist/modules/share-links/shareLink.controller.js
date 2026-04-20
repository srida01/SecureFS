"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getShareLink = exports.createShareLink = void 0;
const prisma_1 = require("../../utils/prisma");
const errorHandler_1 = require("../../middleware/errorHandler");
const auditLogger_1 = require("../../middleware/auditLogger");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const uuid_1 = require("uuid");
const createShareLink = async (req, res) => {
    const { resourceId, resourceType, password, expiresAt } = req.body;
    if (!resourceId || !resourceType) {
        throw new errorHandler_1.AppError(400, 'resourceId and resourceType are required');
    }
    if (!['file', 'folder'].includes(resourceType)) {
        throw new errorHandler_1.AppError(400, 'Invalid resource type');
    }
    const resource = resourceType === 'file'
        ? await prisma_1.prisma.file.findUnique({ where: { id: resourceId } })
        : await prisma_1.prisma.folder.findUnique({ where: { id: resourceId } });
    if (!resource) {
        throw new errorHandler_1.AppError(404, 'Resource not found');
    }
    if (resource.ownerId !== req.userId) {
        throw new errorHandler_1.AppError(403, 'Access denied');
    }
    let expiresAtDate = null;
    if (expiresAt) {
        expiresAtDate = new Date(expiresAt);
        if (Number.isNaN(expiresAtDate.getTime())) {
            throw new errorHandler_1.AppError(400, 'Invalid expiresAt value');
        }
    }
    const passwordHash = password
        ? await bcryptjs_1.default.hash(String(password), 10)
        : null;
    const shareLink = await prisma_1.prisma.shareLink.create({
        data: {
            token: (0, uuid_1.v4)(),
            resourceId,
            resourceType,
            createdBy: req.userId,
            passwordHash: passwordHash || undefined,
            expiresAt: expiresAtDate,
        },
    });
    await (0, auditLogger_1.createAuditLog)(req.userId, 'share', resourceId, resourceType, {
        shareLinkId: shareLink.id,
        expiresAt: expiresAtDate?.toISOString(),
        protected: Boolean(password),
    });
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
exports.createShareLink = createShareLink;
const getShareLink = async (req, res) => {
    const { token } = req.params;
    const { password } = req.query;
    // 🔍 Find share link
    const link = await prisma_1.prisma.shareLink.findUnique({
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
    if (!link ||
        !link.isActive ||
        (link.expiresAt && link.expiresAt < new Date())) {
        throw new errorHandler_1.AppError(404, 'Share link expired or invalid');
    }
    // 🔐 Password protection
    if (link.passwordHash) {
        if (!password) {
            throw new errorHandler_1.AppError(401, 'Password required to access this link');
        }
        const isValid = await bcryptjs_1.default.compare(String(password), link.passwordHash);
        if (!isValid) {
            throw new errorHandler_1.AppError(401, 'Incorrect password');
        }
    }
    // 📦 Fetch actual resource
    const resource = link.resourceType === 'file'
        ? await prisma_1.prisma.file.findUnique({ where: { id: link.resourceId } })
        : await prisma_1.prisma.folder.findUnique({ where: { id: link.resourceId } });
    if (!resource) {
        throw new errorHandler_1.AppError(404, 'Shared resource not found');
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
exports.getShareLink = getShareLink;
//# sourceMappingURL=shareLink.controller.js.map