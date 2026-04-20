"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuditLog = void 0;
const prisma_1 = require("../utils/prisma");
const createAuditLog = async (actorId, action, resourceId, resourceType, metadata, status = 'success', ipAddress) => {
    await prisma_1.prisma.auditLog.create({
        data: {
            actorId,
            action,
            resourceId,
            resourceType,
            metadata: metadata || undefined,
            status,
            ipAddress,
        },
    });
};
exports.createAuditLog = createAuditLog;
//# sourceMappingURL=auditLogger.js.map