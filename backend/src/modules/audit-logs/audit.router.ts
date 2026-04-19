import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { getMyAuditLogs, exportMyAuditLogs } from './audit.controller';

export const auditRouter = Router();
auditRouter.use(authenticate);
auditRouter.get('/me', getMyAuditLogs);
auditRouter.get('/me/export', exportMyAuditLogs);
