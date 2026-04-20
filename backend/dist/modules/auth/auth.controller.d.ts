import { Response } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
export declare const syncUser: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getMe: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=auth.controller.d.ts.map