export interface TrashItem {
    id: string;
    name: string;
    type: 'file' | 'folder';
    deletedAt: Date;
    deletedBy: string;
    sizeBytes?: bigint;
    ownerId: string;
}
export declare const trashService: {
    /**
     * Get all trash items (files and folders) for a user
     */
    getTrashItems(userId: string): Promise<TrashItem[]>;
    /**
     * Get deleted files for a user
     */
    getDeletedFiles(userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        ownerId: string;
        isDeleted: boolean;
        deletedAt: Date | null;
        deletedBy: string | null;
        storageKey: string;
        folderId: string;
        originalName: string;
        mimeType: string | null;
        sizeBytes: bigint;
        checksumSha256: string | null;
    }[]>;
    /**
     * Get deleted folders for a user
     */
    getDeletedFolders(userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        ownerId: string;
        parentFolderId: string | null;
        path: string;
        depth: number;
        isDeleted: boolean;
        deletedAt: Date | null;
        deletedBy: string | null;
    }[]>;
    /**
     * Soft delete a file (move to trash)
     */
    softDeleteFile(fileId: string, userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        ownerId: string;
        isDeleted: boolean;
        deletedAt: Date | null;
        deletedBy: string | null;
        storageKey: string;
        folderId: string;
        originalName: string;
        mimeType: string | null;
        sizeBytes: bigint;
        checksumSha256: string | null;
    }>;
    /**
     * Soft delete a folder and all its contents (move to trash)
     */
    softDeleteFolder(folderId: string, userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        ownerId: string;
        parentFolderId: string | null;
        path: string;
        depth: number;
        isDeleted: boolean;
        deletedAt: Date | null;
        deletedBy: string | null;
    }>;
    /**
     * Restore a file from trash
     */
    restoreFile(fileId: string, userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        ownerId: string;
        isDeleted: boolean;
        deletedAt: Date | null;
        deletedBy: string | null;
        storageKey: string;
        folderId: string;
        originalName: string;
        mimeType: string | null;
        sizeBytes: bigint;
        checksumSha256: string | null;
    }>;
    /**
     * Restore a folder and all its contents from trash
     */
    restoreFolder(folderId: string, userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        ownerId: string;
        parentFolderId: string | null;
        path: string;
        depth: number;
        isDeleted: boolean;
        deletedAt: Date | null;
        deletedBy: string | null;
    }>;
    /**
     * Permanently delete a file from trash (hard delete)
     */
    hardDeleteFile(fileId: string, userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Permanently delete a folder and all its contents from trash (hard delete)
     */
    hardDeleteFolder(folderId: string, userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Empty entire trash for a user (permanently delete all trash items)
     */
    emptyTrash(userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
};
//# sourceMappingURL=trash.service.d.ts.map