"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserQuota = exports.getAllUsers = exports.getAuditLogs = void 0;
const prisma_1 = require("../../utils/prisma");
const getAuditLogs = async (req, res) => {
    const { userId, action, from, to, page = '1', limit = '50' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const logs = await prisma_1.prisma.auditLog.findMany({
        where: {
            ...(userId && { actorId: String(userId) }),
            ...(action && { action: action }),
            ...(from && { createdAt: { gte: new Date(String(from)) } }),
            ...(to && { createdAt: { lte: new Date(String(to)) } }),
        },
        include: { actor: { select: { id: true, clerkUserId: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
    });
    res.json({ success: true, data: logs });
};
exports.getAuditLogs = getAuditLogs;
const getAllUsers = async (req, res) => {
    const users = await prisma_1.prisma.user.findMany({
        include: { storageQuota: true },
        orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: users });
};
exports.getAllUsers = getAllUsers;
const updateUserQuota = async (req, res) => {
    const { quotaBytes } = req.body;
    const quota = await prisma_1.prisma.storageQuota.update({
        where: { userId: req.params.id },
        data: { quotaBytes: BigInt(quotaBytes) },
    });
    res.json({ success: true, data: quota });
};
exports.updateUserQuota = updateUserQuota;
//# sourceMappingURL=admin.controller.js.map