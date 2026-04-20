"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportMyAuditLogs = exports.getMyAuditLogs = void 0;
const prisma_1 = require("../../utils/prisma");
const errorHandler_1 = require("../../middleware/errorHandler");
const getMyAuditLogs = async (req, res) => {
    const { page = '1', limit = '50' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const logs = await prisma_1.prisma.auditLog.findMany({
        where: { actorId: req.userId },
        include: { actor: { select: { id: true, clerkUserId: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
    });
    res.json({ success: true, data: logs });
};
exports.getMyAuditLogs = getMyAuditLogs;
const exportMyAuditLogs = async (req, res) => {
    const { format = 'json' } = req.query;
    const logs = await prisma_1.prisma.auditLog.findMany({
        where: { actorId: req.userId },
        include: { actor: { select: { id: true, clerkUserId: true, role: true } } },
        orderBy: { createdAt: 'desc' },
    });
    if (String(format).toLowerCase() === 'csv') {
        const header = ['id', 'action', 'resourceType', 'resourceId', 'status', 'ipAddress', 'createdAt', 'metadata'];
        const rows = logs.map((log) => [
            log.id,
            log.action,
            log.resourceType || '',
            log.resourceId || '',
            log.status,
            log.ipAddress || '',
            log.createdAt.toISOString(),
            log.metadata ? JSON.stringify(log.metadata) : '',
        ]);
        const csv = [header.join(','), ...rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
        return res.send(csv);
    }
    if (String(format).toLowerCase() !== 'json') {
        throw new errorHandler_1.AppError(400, 'Invalid export format');
    }
    res.json({ success: true, data: logs });
};
exports.exportMyAuditLogs = exportMyAuditLogs;
//# sourceMappingURL=audit.controller.js.map