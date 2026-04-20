"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.syncUser = void 0;
const prisma_1 = require("../../utils/prisma");
const auditLogger_1 = require("../../middleware/auditLogger");
const syncUser = async (req, res) => {
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: req.userId },
        include: { storageQuota: true },
    });
    await prisma_1.prisma.user.update({
        where: { id: req.userId },
        data: { lastLoginAt: new Date() },
    });
    await (0, auditLogger_1.createAuditLog)(req.userId, 'login', undefined, undefined, {}, 'success', req.ip);
    res.json({ success: true, data: user });
};
exports.syncUser = syncUser;
const getMe = async (req, res) => {
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: req.userId },
        include: { storageQuota: true },
    });
    res.json({ success: true, data: user });
};
exports.getMe = getMe;
//# sourceMappingURL=auth.controller.js.map