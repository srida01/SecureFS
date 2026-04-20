import { Response } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
export declare const uploadFile: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getFiles: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getFileById: (req: AuthRequest, res: Response) => Promise<void>;
export declare const downloadFile: (req: AuthRequest, res: Response) => Promise<void>;
export declare const renameFile: (req: AuthRequest, res: Response) => Promise<void>;
export declare const restoreFile: (req: AuthRequest, res: Response) => Promise<void>;
export declare const deleteFile: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getDeletedFiles: (req: AuthRequest, res: Response) => Promise<void>;
export declare const batchDeleteFiles: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getFileVersions: (req: AuthRequest, res: Response) => Promise<void>;
export declare const restoreFileVersion: (req: AuthRequest, res: Response) => Promise<void>;
export declare const downloadFileVersion: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getFileAuditLogs: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=file.controller.d.ts.map