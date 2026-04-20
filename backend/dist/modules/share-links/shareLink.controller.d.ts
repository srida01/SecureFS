import { Response } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
export declare const createShareLink: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getShareLink: (req: AuthRequest, res: Response) => Promise<void>;
export declare const downloadSharedFile: (req: AuthRequest, res: Response) => Promise<void>;
export declare const claimSharedAccess: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=shareLink.controller.d.ts.map