"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.permissionRouter = void 0;
const express_1 = require("express");
const authenticate_1 = require("../../middleware/authenticate");
const permission_controller_1 = require("./permission.controller");
exports.permissionRouter = (0, express_1.Router)();
exports.permissionRouter.use(authenticate_1.authenticate);
exports.permissionRouter.post('/share', permission_controller_1.shareResource);
exports.permissionRouter.get('/resource', permission_controller_1.getResourcePermissions);
exports.permissionRouter.patch('/:id', permission_controller_1.updatePermission);
exports.permissionRouter.delete('/:id', permission_controller_1.revokePermission);
exports.permissionRouter.get('/shared-with-me', permission_controller_1.getSharedWithMe);
exports.permissionRouter.get('/shared-by-me', permission_controller_1.getSharedByMe);
//# sourceMappingURL=permission.router.js.map