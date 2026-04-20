import { Response } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
/**
 * Get all trash items (files and folders) for the authenticated user
 */
export declare const getTrashItems: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Get deleted files for the authenticated user
 */
export declare const getDeletedFiles: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Get deleted folders for the authenticated user
 */
export declare const getDeletedFolders: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Restore a file from trash
 */
export declare const restoreFile: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Restore a folder from trash
 */
export declare const restoreFolder: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Permanently delete a file from trash (hard delete)
 */
export declare const hardDeleteFile: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Permanently delete a folder and its contents from trash (hard delete)
 */
export declare const hardDeleteFolder: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Permanently delete a trash item (file or folder)
 * Determines type from request or tries both
 */
export declare const hardDeleteItem: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Empty entire trash for the authenticated user
 */
export declare const emptyTrash: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=trash.controller.d.ts.map