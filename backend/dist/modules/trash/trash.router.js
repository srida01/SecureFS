"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trashRouter = void 0;
const express_1 = require("express");
const authenticate_1 = require("../../middleware/authenticate");
const trash_controller_1 = require("./trash.controller");
exports.trashRouter = (0, express_1.Router)();
// All routes require authentication
exports.trashRouter.use(authenticate_1.authenticate);
// Get trash items
exports.trashRouter.get('/', trash_controller_1.getTrashItems);
exports.trashRouter.get('/files', trash_controller_1.getDeletedFiles);
exports.trashRouter.get('/folders', trash_controller_1.getDeletedFolders);
// Restore items from trash
exports.trashRouter.post('/files/:id/restore', trash_controller_1.restoreFile);
exports.trashRouter.post('/folders/:id/restore', trash_controller_1.restoreFolder);
// Delete items from trash (permanent deletion)
exports.trashRouter.delete('/files/:id', trash_controller_1.hardDeleteFile);
exports.trashRouter.delete('/folders/:id', trash_controller_1.hardDeleteFolder);
exports.trashRouter.delete('/:id', trash_controller_1.hardDeleteItem);
// Empty entire trash
exports.trashRouter.delete('/', trash_controller_1.emptyTrash);
//# sourceMappingURL=trash.router.js.map