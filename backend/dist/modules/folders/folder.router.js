"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.folderRouter = void 0;
const express_1 = require("express");
const authenticate_1 = require("../../middleware/authenticate");
const folder_controller_1 = require("./folder.controller");
exports.folderRouter = (0, express_1.Router)();
exports.folderRouter.use(authenticate_1.authenticate);
exports.folderRouter.post('/', folder_controller_1.createFolder);
exports.folderRouter.post('/batch-delete', folder_controller_1.batchDeleteFolders);
exports.folderRouter.get('/', folder_controller_1.getFolders);
exports.folderRouter.get('/deleted', folder_controller_1.getDeletedFolders);
exports.folderRouter.get('/:id', folder_controller_1.getFolder);
exports.folderRouter.get('/:id/audit-logs', folder_controller_1.getFolderAuditLogs);
exports.folderRouter.patch('/:id', folder_controller_1.renameFolder);
exports.folderRouter.put('/:id/restore', folder_controller_1.restoreFolder);
exports.folderRouter.get('/:id/download', folder_controller_1.downloadFolder);
exports.folderRouter.delete('/:id', folder_controller_1.deleteFolder);
//# sourceMappingURL=folder.router.js.map