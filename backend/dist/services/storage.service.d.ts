export declare const storageService: {
    uploadFile(buffer: Buffer, originalName: string, mimeType: string): Promise<{
        key: string;
        checksum: string;
    }>;
    deleteFile(key: string): Promise<void>;
    getFileUrl(key: string): string;
};
//# sourceMappingURL=storage.service.d.ts.map