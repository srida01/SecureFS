"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFolderAuditLogs = exports.batchDeleteFolders = exports.getDeletedFolders = exports.downloadFolder = exports.restoreFolder = exports.deleteFolder = exports.renameFolder = exports.getFolder = exports.getFolders = exports.createFolder = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const archiver_1 = __importDefault(require("archiver"));
const prisma_1 = require("../../utils/prisma");
const errorHandler_1 = require("../../middleware/errorHandler");
const auditLogger_1 = require("../../middleware/auditLogger");
const accessControl_1 = require("../../utils/accessControl");
const createFolder = async (req, res) => {
    const { name, parentFolderId } = req.body;
    if (!name)
        throw new errorHandler_1.AppError(400, 'Folder name is required');
    let depth = 0;
    let folderPath = `/${name}`;
    if (parentFolderId) {
        const parent = await prisma_1.prisma.folder.findUnique({ where: { id: parentFolderId } });
        if (!parent || parent.isDeleted)
            throw new errorHandler_1.AppError(404, 'Parent folder not found');
        if (parent.ownerId !== req.userId) {
            const canEdit = await (0, accessControl_1.hasPermission)(req.userId, parent.id, 'folder', 'edit');
            if (!canEdit)
                throw new errorHandler_1.AppError(403, 'Access denied');
        }
        depth = parent.depth + 1;
        folderPath = `${parent.path}/${name}`;
    }
    const folder = await prisma_1.prisma.folder.create({
        data: {
            ownerId: req.userId,
            parentFolderId: parentFolderId || null,
            name,
            path: folderPath,
            depth,
        },
    });
    await (0, auditLogger_1.createAuditLog)(req.userId, 'edit', folder.id, 'folder', { action: 'create', name });
    res.status(201).json({ success: true, data: folder });
};
exports.createFolder = createFolder;
const getFolders = async (req, res) => {
    const { parentFolderId } = req.query;
    if (parentFolderId) {
        const parentId = String(parentFolderId);
        const parent = await prisma_1.prisma.folder.findUnique({ where: { id: parentId } });
        if (!parent || parent.isDeleted)
            throw new errorHandler_1.AppError(404, 'Parent folder not found');
        if (parent.ownerId !== req.userId) {
            const canView = await (0, accessControl_1.hasPermission)(req.userId, parentId, 'folder', 'view');
            if (!canView)
                throw new errorHandler_1.AppError(403, 'Access denied');
        }
        const folders = await prisma_1.prisma.folder.findMany({
            where: {
                parentFolderId: parentId,
                isDeleted: false,
            },
            orderBy: { name: 'asc' },
        });
        res.json({ success: true, data: folders });
        return;
    }
    const folders = await prisma_1.prisma.folder.findMany({
        where: {
            ownerId: req.userId,
            parentFolderId: null,
            isDeleted: false,
        },
        orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: folders });
};
exports.getFolders = getFolders;
const buildFolderPath = (parentPath, name) => (parentPath ? `${parentPath}/${name}` : `/${name}`);
const updateFolderTree = async (folderId, parentPath, depth, updatedFields = {}) => {
    const folder = await prisma_1.prisma.folder.findUnique({
        where: { id: folderId },
        select: { id: true, name: true },
    });
    if (!folder)
        return;
    const folderName = updatedFields.name || folder.name;
    const folderPath = buildFolderPath(parentPath, folderName);
    await prisma_1.prisma.folder.update({
        where: { id: folderId },
        data: { ...updatedFields, path: folderPath, depth },
    });
    const children = await prisma_1.prisma.folder.findMany({ where: { parentFolderId: folderId }, select: { id: true } });
    for (const child of children) {
        await updateFolderTree(child.id, folderPath, depth + 1);
    }
};
const getDescendantFolderIds = async (folder) => {
    const children = await prisma_1.prisma.folder.findMany({
        where: {
            path: { startsWith: `${folder.path}/` },
        },
        select: { id: true },
    });
    return children.map((child) => child.id);
};
const getFolder = async (req, res) => {
    const folder = await prisma_1.prisma.folder.findUnique({ where: { id: req.params.id } });
    if (!folder || folder.isDeleted)
        throw new errorHandler_1.AppError(404, 'Folder not found');
    if (folder.ownerId !== req.userId) {
        const canView = await (0, accessControl_1.hasPermission)(req.userId, folder.id, 'folder', 'view');
        if (!canView)
            throw new errorHandler_1.AppError(403, 'Access denied');
        const perm = await (0, accessControl_1.getEffectivePermission)(req.userId, folder.id, 'folder');
        res.json({
            success: true,
            data: {
                ...folder,
                permissionLevel: perm?.permissionLevel || 'view',
            },
        });
        return;
    }
    res.json({
        success: true,
        data: {
            ...folder,
            permissionLevel: 'owner',
        },
    });
};
exports.getFolder = getFolder;
const renameFolder = async (req, res) => {
    const { name, parentFolderId } = req.body;
    const folder = await prisma_1.prisma.folder.findUnique({ where: { id: req.params.id } });
    if (!folder)
        throw new errorHandler_1.AppError(404, 'Folder not found');
    if (folder.ownerId !== req.userId) {
        const canEdit = await (0, accessControl_1.hasPermission)(req.userId, folder.id, 'folder', 'edit');
        if (!canEdit)
            throw new errorHandler_1.AppError(403, 'Access denied');
    }
    let parent = null;
    let depth = 0;
    if (parentFolderId) {
        parent = await prisma_1.prisma.folder.findUnique({ where: { id: parentFolderId } });
        if (!parent || parent.isDeleted)
            throw new errorHandler_1.AppError(404, 'New parent folder not found');
        if (parent.id === folder.id)
            throw new errorHandler_1.AppError(400, 'Cannot move folder into itself');
        depth = parent.depth + 1;
    }
    const updatedFields = {};
    if (name)
        updatedFields.name = name;
    if (req.body.hasOwnProperty('parentFolderId'))
        updatedFields.parentFolderId = parentFolderId || null;
    await updateFolderTree(folder.id, parent ? parent.path : null, depth, updatedFields);
    await (0, auditLogger_1.createAuditLog)(req.userId, 'edit', folder.id, 'folder', {
        action: 'update',
        oldName: folder.name,
        newName: name || folder.name,
        newParentFolderId: parentFolderId || null,
    });
    const updated = await prisma_1.prisma.folder.findUnique({ where: { id: req.params.id } });
    res.json({ success: true, data: updated });
};
exports.renameFolder = renameFolder;
const deleteFolder = async (req, res) => {
    const folder = await prisma_1.prisma.folder.findUnique({ where: { id: req.params.id } });
    if (!folder)
        throw new errorHandler_1.AppError(404, 'Folder not found');
    if (folder.ownerId !== req.userId) {
        const canDelete = await (0, accessControl_1.hasPermission)(req.userId, folder.id, 'folder', 'delete');
        if (!canDelete)
            throw new errorHandler_1.AppError(403, 'Access denied');
    }
    const descendantIds = await getDescendantFolderIds(folder);
    const allFolderIds = [folder.id, ...descendantIds];
    const filesToDelete = await prisma_1.prisma.file.findMany({
        where: {
            folderId: { in: allFolderIds },
            ownerId: req.userId,
            isDeleted: false,
        },
        select: { id: true, name: true, sizeBytes: true },
    });
    const totalSize = filesToDelete.reduce((sum, f) => sum + f.sizeBytes, BigInt(0));
    await prisma_1.prisma.folder.updateMany({
        where: { id: { in: allFolderIds } },
        data: { isDeleted: true },
    });
    await prisma_1.prisma.file.updateMany({
        where: { folderId: { in: allFolderIds }, ownerId: req.userId },
        data: { isDeleted: true },
    });
    await prisma_1.prisma.storageQuota.update({
        where: { userId: req.userId },
        data: { usedBytes: { decrement: totalSize } },
    });
    const deletedFilesList = filesToDelete.map(f => ({
        id: f.id,
        name: f.name,
    }));
    await (0, auditLogger_1.createAuditLog)(req.userId, 'delete', folder.id, 'folder', {
        name: folder.name,
        deletedFilesCount: filesToDelete.length,
        deletedFolderCount: allFolderIds.length,
        deletedFiles: deletedFilesList,
        totalDeletedSize: totalSize.toString(),
    });
    res.json({ success: true, message: 'Folder deleted with contents moved to trash' });
};
exports.deleteFolder = deleteFolder;
const restoreFolder = async (req, res) => {
    const folder = await prisma_1.prisma.folder.findUnique({ where: { id: req.params.id } });
    if (!folder || folder.ownerId !== req.userId)
        throw new errorHandler_1.AppError(403, 'Access denied');
    if (!folder.isDeleted)
        throw new errorHandler_1.AppError(400, 'Folder is not deleted');
    const descendantIds = await getDescendantFolderIds(folder);
    const allFolderIds = [folder.id, ...descendantIds];
    const filesToRestore = await prisma_1.prisma.file.findMany({
        where: {
            folderId: { in: allFolderIds },
            ownerId: req.userId,
            isDeleted: true,
        },
        select: { id: true, sizeBytes: true },
    });
    const totalSize = filesToRestore.reduce((sum, f) => sum + f.sizeBytes, BigInt(0));
    await prisma_1.prisma.folder.updateMany({
        where: { id: { in: allFolderIds } },
        data: { isDeleted: false },
    });
    await prisma_1.prisma.file.updateMany({
        where: { folderId: { in: allFolderIds }, ownerId: req.userId },
        data: { isDeleted: false },
    });
    await prisma_1.prisma.storageQuota.update({
        where: { userId: req.userId },
        data: { usedBytes: { increment: totalSize } },
    });
    await (0, auditLogger_1.createAuditLog)(req.userId, 'edit', folder.id, 'folder', { action: 'restore', name: folder.name });
    res.json({ success: true, message: 'Folder restored' });
};
exports.restoreFolder = restoreFolder;
const downloadFolder = async (req, res) => {
    const folder = await prisma_1.prisma.folder.findUnique({ where: { id: req.params.id } });
    if (!folder || folder.isDeleted)
        throw new errorHandler_1.AppError(404, 'Folder not found');
    if (folder.ownerId !== req.userId) {
        const canDownload = await (0, accessControl_1.hasPermission)(req.userId, folder.id, 'folder', 'view');
        if (!canDownload)
            throw new errorHandler_1.AppError(403, 'Access denied');
    }
    if (process.env.USE_LOCAL_STORAGE !== 'true') {
        throw new errorHandler_1.AppError(400, 'Folder download is supported only when local storage is enabled');
    }
    const storageRoot = process.env.LOCAL_UPLOAD_PATH || './uploads';
    const descendantIds = await getDescendantFolderIds(folder);
    const allFolderIds = [folder.id, ...descendantIds];
    const files = await prisma_1.prisma.file.findMany({
        where: { folderId: { in: allFolderIds }, isDeleted: false },
        include: { folder: { select: { path: true } } },
    });
    res.setHeader('Content-Disposition', `attachment; filename="${folder.name}.zip"`);
    res.setHeader('Content-Type', 'application/zip');
    const archive = (0, archiver_1.default)('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => {
        throw err;
    });
    archive.pipe(res);
    for (const file of files) {
        const filePath = path_1.default.join(storageRoot, file.storageKey);
        if (fs_1.default.existsSync(filePath)) {
            const zipEntryName = `${file.folder.path.replace(/^\//, '')}/${file.name}`;
            archive.file(filePath, { name: zipEntryName });
        }
    }
    await archive.finalize();
};
exports.downloadFolder = downloadFolder;
const getDeletedFolders = async (req, res) => {
    const folders = await prisma_1.prisma.folder.findMany({
        where: {
            ownerId: req.userId,
            isDeleted: true,
        },
        orderBy: { updatedAt: 'desc' },
    });
    res.json({ success: true, data: folders });
};
exports.getDeletedFolders = getDeletedFolders;
const batchDeleteFolders = async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0)
        throw new errorHandler_1.AppError(400, 'Invalid ids array');
    const folders = await prisma_1.prisma.folder.findMany({
        where: { id: { in: ids }, ownerId: req.userId },
    });
    if (folders.length !== ids.length)
        throw new errorHandler_1.AppError(403, 'Access denied to some folders');
    await prisma_1.prisma.folder.updateMany({
        where: { id: { in: ids } },
        data: { isDeleted: true },
    });
    const folderDetails = folders.map(f => ({ id: f.id, name: f.name }));
    await (0, auditLogger_1.createAuditLog)(req.userId, 'delete', '', 'folder', {
        count: ids.length,
        folders: folderDetails
    });
    res.json({ success: true, message: `${ids.length} folders deleted` });
};
exports.batchDeleteFolders = batchDeleteFolders;
const getFolderAuditLogs = async (req, res) => {
    const folder = await prisma_1.prisma.folder.findUnique({ where: { id: req.params.id } });
    if (!folder || folder.isDeleted) {
        throw new errorHandler_1.AppError(404, 'Folder not found');
    }
    if (folder.ownerId !== req.userId) {
        const perm = await prisma_1.prisma.permission.findFirst({
            where: {
                resourceId: folder.id,
                granteeUserId: req.userId,
                resourceType: 'folder',
            },
        });
        if (!perm)
            throw new errorHandler_1.AppError(403, 'Access denied');
    }
    // Get all audit logs for the folder
    const folderLogs = await prisma_1.prisma.auditLog.findMany({
        where: { resourceId: folder.id, resourceType: 'folder' },
        include: { actor: { select: { clerkUserId: true } } },
        orderBy: { createdAt: 'desc' },
    });
    // Recursive function to get all file IDs
    const getAllFiles = async (folderId) => {
        const files = await prisma_1.prisma.file.findMany({
            where: { folderId, isDeleted: false },
            select: { id: true },
        });
        const fileIds = files.map((f) => f.id);
        const childFolders = await prisma_1.prisma.folder.findMany({
            where: { parentFolderId: folderId, isDeleted: false },
            select: { id: true },
        });
        for (const child of childFolders) {
            const childFileIds = await getAllFiles(child.id);
            fileIds.push(...childFileIds);
        }
        return fileIds;
    };
    const allFileIds = await getAllFiles(folder.id);
    // Get file audit logs
    const fileLogs = await prisma_1.prisma.auditLog.findMany({
        where: {
            resourceId: { in: allFileIds },
            resourceType: 'file',
        },
        include: { actor: { select: { clerkUserId: true } } },
        orderBy: { createdAt: 'desc' },
    });
    // Combine and sort logs
    const allLogs = [...folderLogs, ...fileLogs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ success: true, data: allLogs });
};
exports.getFolderAuditLogs = getFolderAuditLogs;
//# sourceMappingURL=folder.controller.js.map