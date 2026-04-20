"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emptyTrash = exports.hardDeleteItem = exports.hardDeleteFolder = exports.hardDeleteFile = exports.restoreFolder = exports.restoreFile = exports.getDeletedFolders = exports.getDeletedFiles = exports.getTrashItems = void 0;
const trash_service_1 = require("./trash.service");
const errorHandler_1 = require("../../middleware/errorHandler");
const auditLogger_1 = require("../../middleware/auditLogger");
/**
 * Get all trash items (files and folders) for the authenticated user
 */
const getTrashItems = async (req, res) => {
    const items = await trash_service_1.trashService.getTrashItems(req.userId);
    res.json({ success: true, data: items });
};
exports.getTrashItems = getTrashItems;
/**
 * Get deleted files for the authenticated user
 */
const getDeletedFiles = async (req, res) => {
    const files = await trash_service_1.trashService.getDeletedFiles(req.userId);
    res.json({ success: true, data: files });
};
exports.getDeletedFiles = getDeletedFiles;
/**
 * Get deleted folders for the authenticated user
 */
const getDeletedFolders = async (req, res) => {
    const folders = await trash_service_1.trashService.getDeletedFolders(req.userId);
    res.json({ success: true, data: folders });
};
exports.getDeletedFolders = getDeletedFolders;
/**
 * Restore a file from trash
 */
const restoreFile = async (req, res) => {
    const { id } = req.params;
    const file = await trash_service_1.trashService.restoreFile(id, req.userId);
    await (0, auditLogger_1.createAuditLog)(req.userId, 'restore', id, 'file', {
        action: 'restore_from_trash',
        fileName: file.name,
    });
    res.json({
        success: true,
        message: 'File restored from trash',
        data: file,
    });
};
exports.restoreFile = restoreFile;
/**
 * Restore a folder from trash
 */
const restoreFolder = async (req, res) => {
    const { id } = req.params;
    const folder = await trash_service_1.trashService.restoreFolder(id, req.userId);
    await (0, auditLogger_1.createAuditLog)(req.userId, 'restore', id, 'folder', {
        action: 'restore_from_trash',
        folderName: folder.name,
    });
    res.json({
        success: true,
        message: 'Folder restored from trash',
        data: folder,
    });
};
exports.restoreFolder = restoreFolder;
/**
 * Permanently delete a file from trash (hard delete)
 */
const hardDeleteFile = async (req, res) => {
    const { id } = req.params;
    // Get file info before deletion for audit log
    const file = await trash_service_1.trashService.getDeletedFiles(req.userId).then((files) => files.find((f) => f.id === id));
    if (!file)
        throw new errorHandler_1.AppError(404, 'File not found in trash');
    const result = await trash_service_1.trashService.hardDeleteFile(id, req.userId);
    await (0, auditLogger_1.createAuditLog)(req.userId, 'delete', id, 'file', {
        action: 'hard_delete_from_trash',
        fileName: file.name,
        sizeBytes: file.sizeBytes.toString(),
    });
    res.json(result);
};
exports.hardDeleteFile = hardDeleteFile;
/**
 * Permanently delete a folder and its contents from trash (hard delete)
 */
const hardDeleteFolder = async (req, res) => {
    const { id } = req.params;
    // Get folder info before deletion for audit log
    const folder = await trash_service_1.trashService.getDeletedFolders(req.userId).then((folders) => folders.find((f) => f.id === id));
    if (!folder)
        throw new errorHandler_1.AppError(404, 'Folder not found in trash');
    const result = await trash_service_1.trashService.hardDeleteFolder(id, req.userId);
    await (0, auditLogger_1.createAuditLog)(req.userId, 'delete', id, 'folder', {
        action: 'hard_delete_from_trash',
        folderName: folder.name,
    });
    res.json(result);
};
exports.hardDeleteFolder = hardDeleteFolder;
/**
 * Permanently delete a trash item (file or folder)
 * Determines type from request or tries both
 */
const hardDeleteItem = async (req, res) => {
    const { id } = req.params;
    const { type } = req.query;
    if (type === 'file') {
        return (0, exports.hardDeleteFile)(req, res);
    }
    else if (type === 'folder') {
        return (0, exports.hardDeleteFolder)(req, res);
    }
    else {
        // Try to determine type automatically
        const deletedFiles = await trash_service_1.trashService.getDeletedFiles(req.userId);
        const deletedFolders = await trash_service_1.trashService.getDeletedFolders(req.userId);
        const isFile = deletedFiles.some((f) => f.id === id);
        const isFolder = deletedFolders.some((f) => f.id === id);
        if (isFile) {
            return (0, exports.hardDeleteFile)(req, res);
        }
        else if (isFolder) {
            return (0, exports.hardDeleteFolder)(req, res);
        }
        else {
            throw new errorHandler_1.AppError(404, 'Item not found in trash');
        }
    }
};
exports.hardDeleteItem = hardDeleteItem;
/**
 * Empty entire trash for the authenticated user
 */
const emptyTrash = async (req, res) => {
    const result = await trash_service_1.trashService.emptyTrash(req.userId);
    await (0, auditLogger_1.createAuditLog)(req.userId, 'delete', '', 'file', {
        action: 'empty_trash',
    });
    res.json(result);
};
exports.emptyTrash = emptyTrash;
//# sourceMappingURL=trash.controller.js.map