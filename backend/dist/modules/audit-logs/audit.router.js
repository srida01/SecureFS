"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditRouter = void 0;
const express_1 = require("express");
const authenticate_1 = require("../../middleware/authenticate");
const audit_controller_1 = require("./audit.controller");
exports.auditRouter = (0, express_1.Router)();
exports.auditRouter.use(authenticate_1.authenticate);
exports.auditRouter.get('/me', audit_controller_1.getMyAuditLogs);
exports.auditRouter.get('/me/export', audit_controller_1.exportMyAuditLogs);
//# sourceMappingURL=audit.router.js.map