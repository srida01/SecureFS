import { AuditAction, AuditStatus } from '@prisma/client';
export declare const createAuditLog: (actorId: string, action: AuditAction, resourceId?: string, resourceType?: string, metadata?: object, status?: AuditStatus, ipAddress?: string) => Promise<void>;
//# sourceMappingURL=auditLogger.d.ts.map