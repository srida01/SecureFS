import { Response } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
export declare const getMyAuditLogs: (req: AuthRequest, res: Response) => Promise<void>;
export declare const exportMyAuditLogs: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=audit.controller.d.ts.map