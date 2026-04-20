"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trashService = void 0;
const prisma_1 = require("../../utils/prisma");
const storage_service_1 = require("../../services/storage.service");
const errorHandler_1 = require("../../middleware/errorHandler");
exports.trashService = {
    /**
     * Get all trash items (files and folders) for a user
     */
    async getTrashItems(userId) {
        const [deletedFiles, deletedFolders] = await Promise.all([
            prisma_1.prisma.file.findMany({
                where: {
                    ownerId: userId,
                    isDeleted: true,
                },
                orderBy: { updatedAt: 'desc' },
            }),
            prisma_1.prisma.folder.findMany({
                where: {
                    ownerId: userId,
                    isDeleted: true,
                },
                orderBy: { updatedAt: 'desc' },
            }),
        ]);
        const items = [
            ...deletedFiles.map((f) => ({
                id: f.id,
                name: f.name,
                type: 'file',
                deletedAt: f.updatedAt,
                deletedBy: f.deletedBy || userId,
                sizeBytes: f.sizeBytes,
                ownerId: f.ownerId,
            })),
            ...deletedFolders.map((f) => ({
                id: f.id,
                name: f.name,
                type: 'folder',
                deletedAt: f.updatedAt,
                deletedBy: f.deletedBy || userId,
                ownerId: f.ownerId,
            })),
        ];
        return items.sort((a, b) => b.deletedAt.getTime() - a.deletedAt.getTime());
    },
    /**
     * Get deleted files for a user
     */
    async getDeletedFiles(userId) {
        return await prisma_1.prisma.file.findMany({
            where: {
                ownerId: userId,
                isDeleted: true,
            },
            orderBy: { updatedAt: 'desc' },
        });
    },
    /**
     * Get deleted folders for a user
     */
    async getDeletedFolders(userId) {
        return await prisma_1.prisma.folder.findMany({
            where: {
                ownerId: userId,
                isDeleted: true,
            },
            orderBy: { updatedAt: 'desc' },
        });
    },
    /**
     * Soft delete a file (move to trash)
     */
    async softDeleteFile(fileId, userId) {
        const file = await prisma_1.prisma.file.findUnique({ where: { id: fileId } });
        if (!file)
            throw new errorHandler_1.AppError(404, 'File not found');
        if (file.ownerId !== userId)
            throw new errorHandler_1.AppError(403, 'Access denied');
        if (file.isDeleted)
            throw new errorHandler_1.AppError(400, 'File is already deleted');
        const updated = await prisma_1.prisma.file.update({
            where: { id: fileId },
            data: {
                isDeleted: true,
                deletedAt: new Date(),
                deletedBy: userId,
            },
        });
        // Deduct from storage quota
        await prisma_1.prisma.storageQuota.update({
            where: { userId },
            data: { usedBytes: { decrement: file.sizeBytes } },
        });
        return updated;
    },
    /**
     * Soft delete a folder and all its contents (move to trash)
     */
    async softDeleteFolder(folderId, userId) {
        const folder = await prisma_1.prisma.folder.findUnique({ where: { id: folderId } });
        if (!folder)
            throw new errorHandler_1.AppError(404, 'Folder not found');
        if (folder.ownerId !== userId)
            throw new errorHandler_1.AppError(403, 'Access denied');
        if (folder.isDeleted)
            throw new errorHandler_1.AppError(400, 'Folder is already deleted');
        // Find all nested folders
        const childFolders = await prisma_1.prisma.folder.findMany({
            where: {
                id: folderId,
            },
            select: { id: true },
        });
        // Get all files in this folder and subfolders
        const filesToDelete = await prisma_1.prisma.file.findMany({
            where: {
                folderId: folderId,
            },
        });
        // Calculate total size
        const totalSize = filesToDelete.reduce((sum, f) => sum + f.sizeBytes, BigInt(0));
        // Soft delete all files
        await prisma_1.prisma.file.updateMany({
            where: { folderId: folderId },
            data: {
                isDeleted: true,
                deletedAt: new Date(),
                deletedBy: userId,
            },
        });
        // Soft delete the folder
        const updated = await prisma_1.prisma.folder.update({
            where: { id: folderId },
            data: {
                isDeleted: true,
                deletedAt: new Date(),
                deletedBy: userId,
            },
        });
        // Deduct from storage quota
        await prisma_1.prisma.storageQuota.update({
            where: { userId },
            data: { usedBytes: { decrement: totalSize } },
        });
        return updated;
    },
    /**
     * Restore a file from trash
     */
    async restoreFile(fileId, userId) {
        const file = await prisma_1.prisma.file.findUnique({ where: { id: fileId } });
        if (!file)
            throw new errorHandler_1.AppError(404, 'File not found');
        if (file.ownerId !== userId)
            throw new errorHandler_1.AppError(403, 'Access denied');
        if (!file.isDeleted)
            throw new errorHandler_1.AppError(400, 'File is not in trash');
        const updated = await prisma_1.prisma.file.update({
            where: { id: fileId },
            data: {
                isDeleted: false,
                deletedAt: null,
                deletedBy: null,
            },
        });
        // Add back to storage quota
        await prisma_1.prisma.storageQuota.update({
            where: { userId },
            data: { usedBytes: { increment: file.sizeBytes } },
        });
        return updated;
    },
    /**
     * Restore a folder and all its contents from trash
     */
    async restoreFolder(folderId, userId) {
        const folder = await prisma_1.prisma.folder.findUnique({ where: { id: folderId } });
        if (!folder)
            throw new errorHandler_1.AppError(404, 'Folder not found');
        if (folder.ownerId !== userId)
            throw new errorHandler_1.AppError(403, 'Access denied');
        if (!folder.isDeleted)
            throw new errorHandler_1.AppError(400, 'Folder is not in trash');
        // Get all files in this folder
        const filesToRestore = await prisma_1.prisma.file.findMany({
            where: {
                folderId: folderId,
            },
        });
        // Calculate total size
        const totalSize = filesToRestore.reduce((sum, f) => sum + f.sizeBytes, BigInt(0));
        // Restore all files
        await prisma_1.prisma.file.updateMany({
            where: { folderId: folderId },
            data: {
                isDeleted: false,
                deletedAt: null,
                deletedBy: null,
            },
        });
        // Restore the folder
        const updated = await prisma_1.prisma.folder.update({
            where: { id: folderId },
            data: {
                isDeleted: false,
                deletedAt: null,
                deletedBy: null,
            },
        });
        // Add back to storage quota
        await prisma_1.prisma.storageQuota.update({
            where: { userId },
            data: { usedBytes: { increment: totalSize } },
        });
        return updated;
    },
    /**
     * Permanently delete a file from trash (hard delete)
     */
    async hardDeleteFile(fileId, userId) {
        const file = await prisma_1.prisma.file.findUnique({ where: { id: fileId } });
        if (!file)
            throw new errorHandler_1.AppError(404, 'File not found');
        if (file.ownerId !== userId)
            throw new errorHandler_1.AppError(403, 'Access denied');
        if (!file.isDeleted)
            throw new errorHandler_1.AppError(400, 'File is not in trash. Use soft delete first');
        // Delete from storage
        try {
            await storage_service_1.storageService.deleteFile(file.storageKey);
        }
        catch (error) {
            console.error('Failed to delete file from storage:', error);
            // Continue with database deletion even if storage deletion fails
        }
        // Delete file versions
        await prisma_1.prisma.fileVersion.deleteMany({
            where: { fileId },
        });
        // Delete file
        await prisma_1.prisma.file.delete({
            where: { id: fileId },
        });
        return { success: true, message: 'File permanently deleted' };
    },
    /**
     * Permanently delete a folder and all its contents from trash (hard delete)
     */
    async hardDeleteFolder(folderId, userId) {
        const folder = await prisma_1.prisma.folder.findUnique({ where: { id: folderId } });
        if (!folder)
            throw new errorHandler_1.AppError(404, 'Folder not found');
        if (folder.ownerId !== userId)
            throw new errorHandler_1.AppError(403, 'Access denied');
        if (!folder.isDeleted)
            throw new errorHandler_1.AppError(400, 'Folder is not in trash. Use soft delete first');
        // Get all files in this folder
        const filesToDelete = await prisma_1.prisma.file.findMany({
            where: {
                folderId: folderId,
            },
        });
        // Delete all files from storage
        for (const file of filesToDelete) {
            try {
                await storage_service_1.storageService.deleteFile(file.storageKey);
            }
            catch (error) {
                console.error(`Failed to delete file ${file.storageKey} from storage:`, error);
            }
        }
        // Delete all file versions
        await prisma_1.prisma.fileVersion.deleteMany({
            where: {
                file: {
                    folderId: folderId,
                },
            },
        });
        // Delete all files
        await prisma_1.prisma.file.deleteMany({
            where: {
                folderId: folderId,
            },
        });
        // Delete the folder
        await prisma_1.prisma.folder.delete({
            where: { id: folderId },
        });
        return { success: true, message: 'Folder and all contents permanently deleted' };
    },
    /**
     * Empty entire trash for a user (permanently delete all trash items)
     */
    async emptyTrash(userId) {
        // Get all deleted files
        const deletedFiles = await prisma_1.prisma.file.findMany({
            where: {
                ownerId: userId,
                isDeleted: true,
            },
        });
        // Delete all files from storage
        for (const file of deletedFiles) {
            try {
                await storage_service_1.storageService.deleteFile(file.storageKey);
            }
            catch (error) {
                console.error(`Failed to delete file ${file.storageKey} from storage:`, error);
            }
        }
        // Delete all file versions for deleted files
        await prisma_1.prisma.fileVersion.deleteMany({
            where: {
                file: {
                    ownerId: userId,
                    isDeleted: true,
                },
            },
        });
        // Delete all deleted files
        await prisma_1.prisma.file.deleteMany({
            where: {
                ownerId: userId,
                isDeleted: true,
            },
        });
        // Delete all deleted folders
        await prisma_1.prisma.folder.deleteMany({
            where: {
                ownerId: userId,
                isDeleted: true,
            },
        });
        return { success: true, message: 'Trash emptied successfully' };
    },
};
//# sourceMappingURL=trash.service.js.map