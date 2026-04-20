"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRouter = void 0;
const express_1 = require("express");
const authenticate_1 = require("../../middleware/authenticate");
const admin_controller_1 = require("./admin.controller");
exports.adminRouter = (0, express_1.Router)();
exports.adminRouter.use(authenticate_1.authenticate, authenticate_1.requireAdmin);
exports.adminRouter.get('/audit-logs', admin_controller_1.getAuditLogs);
exports.adminRouter.get('/users', admin_controller_1.getAllUsers);
exports.adminRouter.patch('/users/:id/quota', admin_controller_1.updateUserQuota);
//# sourceMappingURL=admin.router.js.map