import { Response } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
export declare const getAuditLogs: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getAllUsers: (req: AuthRequest, res: Response) => Promise<void>;
export declare const updateUserQuota: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=admin.controller.d.ts.map