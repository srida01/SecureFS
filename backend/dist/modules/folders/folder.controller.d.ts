import { Response } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
export declare const createFolder: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getFolders: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getFolder: (req: AuthRequest, res: Response) => Promise<void>;
export declare const renameFolder: (req: AuthRequest, res: Response) => Promise<void>;
export declare const deleteFolder: (req: AuthRequest, res: Response) => Promise<void>;
export declare const restoreFolder: (req: AuthRequest, res: Response) => Promise<void>;
export declare const downloadFolder: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getDeletedFolders: (req: AuthRequest, res: Response) => Promise<void>;
export declare const batchDeleteFolders: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getFolderAuditLogs: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=folder.controller.d.ts.map