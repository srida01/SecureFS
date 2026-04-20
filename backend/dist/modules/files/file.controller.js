"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFileAuditLogs = exports.downloadFileVersion = exports.restoreFileVersion = exports.getFileVersions = exports.batchDeleteFiles = exports.getDeletedFiles = exports.deleteFile = exports.restoreFile = exports.renameFile = exports.downloadFile = exports.getFileById = exports.getFiles = exports.uploadFile = void 0;
const prisma_1 = require("../../utils/prisma");
const errorHandler_1 = require("../../middleware/errorHandler");
const auditLogger_1 = require("../../middleware/auditLogger");
const storage_service_1 = require("../../services/storage.service");
const accessControl_1 = require("../../utils/accessControl");
const trash_service_1 = require("../trash/trash.service");
const uploadFile = async (req, res) => {
    if (!req.file)
        throw new errorHandler_1.AppError(400, 'No file provided');
    const { folderId } = req.body;
    if (!folderId)
        throw new errorHandler_1.AppError(400, 'folderId is required');
    const parentFolder = await prisma_1.prisma.folder.findUnique({ where: { id: folderId } });
    if (!parentFolder || parentFolder.isDeleted)
        throw new errorHandler_1.AppError(404, 'Target folder not found');
    if (parentFolder.ownerId !== req.userId) {
        const canEdit = await (0, accessControl_1.hasPermission)(req.userId, folderId, 'folder', 'edit');
        if (!canEdit)
            throw new errorHandler_1.AppError(403, 'Access denied');
    }
    // Check quota
    const quota = await prisma_1.prisma.storageQuota.findUnique({ where: { userId: req.userId } });
    if (!quota)
        throw new errorHandler_1.AppError(404, 'Storage quota not found');
    const fileSize = BigInt(req.file.size);
    if (quota.usedBytes + fileSize > quota.quotaBytes) {
        throw new errorHandler_1.AppError(400, 'Storage quota exceeded');
    }
    // Upload to storage
    const { key, checksum } = await storage_service_1.storageService.uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype);
    // Save to DB
    const file = await prisma_1.prisma.file.create({
        data: {
            ownerId: req.userId,
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
    await prisma_1.prisma.fileVersion.create({
        data: {
            fileId: file.id,
            createdBy: req.userId,
            versionNumber: 1,
            storageKey: key,
            sizeBytes: fileSize,
            checksumSha256: checksum,
        },
    });
    // Update quota
    await prisma_1.prisma.storageQuota.update({
        where: { userId: req.userId },
        data: { usedBytes: { increment: fileSize } },
    });
    await (0, auditLogger_1.createAuditLog)(req.userId, 'upload', file.id, 'file', { name: file.name, size: file.sizeBytes });
    res.status(201).json({ success: true, data: file });
};
exports.uploadFile = uploadFile;
const getFiles = async (req, res) => {
    const { folderId } = req.query;
    if (folderId) {
        const folder = await prisma_1.prisma.folder.findUnique({ where: { id: String(folderId) } });
        if (!folder || folder.isDeleted)
            throw new errorHandler_1.AppError(404, 'Folder not found');
        if (folder.ownerId !== req.userId) {
            const canView = await (0, accessControl_1.hasPermission)(req.userId, folder.id, 'folder', 'view');
            if (!canView)
                throw new errorHandler_1.AppError(403, 'Access denied');
        }
        const files = await prisma_1.prisma.file.findMany({
            where: {
                folderId: String(folderId),
                isDeleted: false,
            },
            orderBy: { name: 'asc' },
        });
        res.json({ success: true, data: files });
        return;
    }
    const files = await prisma_1.prisma.file.findMany({
        where: {
            ownerId: req.userId,
            folderId: undefined,
            isDeleted: false,
        },
        orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: files });
};
exports.getFiles = getFiles;
const getFileById = async (req, res) => {
    const file = await prisma_1.prisma.file.findUnique({ where: { id: req.params.id } });
    if (!file || file.isDeleted)
        throw new errorHandler_1.AppError(404, 'File not found');
    if (file.ownerId !== req.userId) {
        const canView = await (0, accessControl_1.hasPermission)(req.userId, file.id, 'file', 'view');
        if (!canView)
            throw new errorHandler_1.AppError(403, 'Access denied');
    }
    const url = storage_service_1.storageService.getFileUrl(file.storageKey);
    res.json({ success: true, data: { ...file, url } });
};
exports.getFileById = getFileById;
const downloadFile = async (req, res) => {
    const file = await prisma_1.prisma.file.findUnique({ where: { id: req.params.id } });
    if (!file || file.isDeleted)
        throw new errorHandler_1.AppError(404, 'File not found');
    if (file.ownerId !== req.userId) {
        const canDownload = await (0, accessControl_1.hasPermission)(req.userId, file.id, 'file', 'view');
        if (!canDownload)
            throw new errorHandler_1.AppError(403, 'Access denied');
    }
    const url = storage_service_1.storageService.getFileUrl(file.storageKey);
    await (0, auditLogger_1.createAuditLog)(req.userId, 'download', file.id, 'file', { name: file.name });
    res.json({ success: true, data: { url, name: file.name, mimeType: file.mimeType } });
};
exports.downloadFile = downloadFile;
const renameFile = async (req, res) => {
    const { name, folderId } = req.body;
    const file = await prisma_1.prisma.file.findUnique({ where: { id: req.params.id } });
    if (!file)
        throw new errorHandler_1.AppError(404, 'File not found');
    if (file.ownerId !== req.userId) {
        const canEdit = await (0, accessControl_1.hasPermission)(req.userId, file.id, 'file', 'edit');
        if (!canEdit)
            throw new errorHandler_1.AppError(403, 'Access denied');
    }
    const updateData = {};
    if (name)
        updateData.name = name;
    if (folderId) {
        const destinationFolder = await prisma_1.prisma.folder.findUnique({ where: { id: folderId } });
        if (!destinationFolder || destinationFolder.isDeleted)
            throw new errorHandler_1.AppError(404, 'Destination folder not found');
        updateData.folderId = folderId;
    }
    const updated = await prisma_1.prisma.file.update({ where: { id: req.params.id }, data: updateData });
    await (0, auditLogger_1.createAuditLog)(req.userId, 'edit', file.id, 'file', {
        action: 'update',
        oldName: file.name,
        newName: name || file.name,
        oldFolderId: file.folderId,
        newFolderId: folderId || file.folderId,
    });
    res.json({ success: true, data: updated });
};
exports.renameFile = renameFile;
const restoreFile = async (req, res) => {
    const file = await trash_service_1.trashService.restoreFile(req.params.id, req.userId);
    await (0, auditLogger_1.createAuditLog)(req.userId, 'restore', file.id, 'file', {
        action: 'restore',
        name: file.name,
    });
    res.json({ success: true, message: 'File restored', data: file });
};
exports.restoreFile = restoreFile;
const deleteFile = async (req, res) => {
    const file = await prisma_1.prisma.file.findUnique({ where: { id: req.params.id } });
    if (!file)
        throw new errorHandler_1.AppError(404, 'File not found');
    if (file.ownerId !== req.userId) {
        const canDelete = await (0, accessControl_1.hasPermission)(req.userId, file.id, 'file', 'delete');
        if (!canDelete)
            throw new errorHandler_1.AppError(403, 'Access denied');
    }
    const deleted = await trash_service_1.trashService.softDeleteFile(req.params.id, req.userId);
    await (0, auditLogger_1.createAuditLog)(req.userId, 'delete', file.id, 'file', {
        action: 'soft_delete',
        name: file.name,
    });
    res.json({ success: true, message: 'File moved to trash', data: deleted });
};
exports.deleteFile = deleteFile;
const getDeletedFiles = async (req, res) => {
    const files = await prisma_1.prisma.file.findMany({
        where: {
            ownerId: req.userId,
            isDeleted: true,
        },
        orderBy: { updatedAt: 'desc' },
    });
    res.json({ success: true, data: files });
};
exports.getDeletedFiles = getDeletedFiles;
const batchDeleteFiles = async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0)
        throw new errorHandler_1.AppError(400, 'Invalid ids array');
    // Verify ownership of all files
    const files = await prisma_1.prisma.file.findMany({
        where: { id: { in: ids }, ownerId: req.userId },
    });
    if (files.length !== ids.length)
        throw new errorHandler_1.AppError(403, 'Access denied to some files');
    const totalSize = files.reduce((sum, f) => sum + f.sizeBytes, BigInt(0));
    // Mark all as deleted with soft delete
    await prisma_1.prisma.file.updateMany({
        where: { id: { in: ids } },
        data: {
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy: req.userId,
        },
    });
    // Update quota
    await prisma_1.prisma.storageQuota.update({
        where: { userId: req.userId },
        data: { usedBytes: { decrement: totalSize } },
    });
    // Audit log
    await (0, auditLogger_1.createAuditLog)(req.userId, 'delete', '', 'file', {
        action: 'batch_soft_delete',
        count: ids.length,
    });
    res.json({
        success: true,
        message: `${ids.length} files moved to trash`,
    });
};
exports.batchDeleteFiles = batchDeleteFiles;
const getFileVersions = async (req, res) => {
    const { id: fileId } = req.params;
    const file = await prisma_1.prisma.file.findUnique({ where: { id: fileId } });
    if (!file)
        throw new errorHandler_1.AppError(404, 'File not found');
    // Check ownership or permission
    if (file.ownerId !== req.userId) {
        const perm = await prisma_1.prisma.permission.findFirst({
            where: { resourceId: fileId, granteeUserId: req.userId, isActive: true },
        });
        if (!perm)
            throw new errorHandler_1.AppError(403, 'Access denied');
    }
    const versions = await prisma_1.prisma.fileVersion.findMany({
        where: { fileId },
        include: { creator: { select: { id: true, clerkUserId: true } } },
        orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: versions });
};
exports.getFileVersions = getFileVersions;
const restoreFileVersion = async (req, res) => {
    const { id: fileId, versionId } = req.params;
    const file = await prisma_1.prisma.file.findUnique({ where: { id: fileId } });
    if (!file || file.ownerId !== req.userId)
        throw new errorHandler_1.AppError(403, 'Access denied');
    const version = await prisma_1.prisma.fileVersion.findUnique({ where: { id: versionId } });
    if (!version || version.fileId !== fileId)
        throw new errorHandler_1.AppError(404, 'Version not found');
    // Create new version from current file before restoring
    if (!file.isDeleted) {
        const latestVersion = await prisma_1.prisma.fileVersion.findFirst({
            where: { fileId },
            orderBy: { versionNumber: 'desc' },
        });
        const nextVersionNumber = (latestVersion?.versionNumber || 0) + 1;
        await prisma_1.prisma.fileVersion.create({
            data: {
                fileId,
                createdBy: req.userId,
                versionNumber: nextVersionNumber,
                storageKey: file.storageKey,
                sizeBytes: file.sizeBytes,
                checksumSha256: file.checksumSha256,
            },
        });
    }
    // Restore version
    await prisma_1.prisma.file.update({
        where: { id: fileId },
        data: {
            storageKey: version.storageKey,
            sizeBytes: version.sizeBytes,
            checksumSha256: version.checksumSha256,
        },
    });
    await (0, auditLogger_1.createAuditLog)(req.userId, 'restore', fileId, 'file', { versionId });
    res.json({ success: true, message: 'Version restored' });
};
exports.restoreFileVersion = restoreFileVersion;
const downloadFileVersion = async (req, res) => {
    const { id: fileId, versionId } = req.params;
    const file = await prisma_1.prisma.file.findUnique({ where: { id: fileId } });
    if (!file)
        throw new errorHandler_1.AppError(404, 'File not found');
    // Check permission
    if (file.ownerId !== req.userId) {
        const perm = await prisma_1.prisma.permission.findFirst({
            where: { resourceId: fileId, granteeUserId: req.userId, isActive: true },
        });
        if (!perm)
            throw new errorHandler_1.AppError(403, 'Access denied');
    }
    const version = await prisma_1.prisma.fileVersion.findUnique({ where: { id: versionId } });
    if (!version || version.fileId !== fileId)
        throw new errorHandler_1.AppError(404, 'Version not found');
    const url = storage_service_1.storageService.getFileUrl(version.storageKey);
    await (0, auditLogger_1.createAuditLog)(req.userId, 'download', fileId, 'file', { versionId });
    res.json({ success: true, data: { url, name: file.name, mimeType: file.mimeType } });
};
exports.downloadFileVersion = downloadFileVersion;
const getFileAuditLogs = async (req, res) => {
    const file = await prisma_1.prisma.file.findUnique({ where: { id: req.params.id } });
    if (!file || file.isDeleted)
        throw new errorHandler_1.AppError(404, 'File not found');
    if (file.ownerId !== req.userId) {
        const perm = await prisma_1.prisma.permission.findFirst({
            where: { resourceId: file.id, granteeUserId: req.userId, isActive: true },
        });
        if (!perm)
            throw new errorHandler_1.AppError(403, 'Access denied');
    }
    const logs = await prisma_1.prisma.auditLog.findMany({
        where: { resourceId: file.id, resourceType: 'file' },
        include: { actor: { select: { clerkUserId: true } } },
        orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: logs });
};
exports.getFileAuditLogs = getFileAuditLogs;
//# sourceMappingURL=file.controller.js.map