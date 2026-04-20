import { Response } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
export declare const shareResource: (req: AuthRequest, res: Response) => Promise<void>;
export declare const revokePermission: (req: AuthRequest, res: Response) => Promise<void>;
export declare const updatePermission: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getResourcePermissions: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getSharedWithMe: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getSharedByMe: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=permission.controller.d.ts.map