"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileRouter = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const authenticate_1 = require("../../middleware/authenticate");
const file_controller_1 = require("./file.controller");
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } }); // 500MB
exports.fileRouter = (0, express_1.Router)();
exports.fileRouter.use(authenticate_1.authenticate);
exports.fileRouter.post('/upload', upload.single('file'), file_controller_1.uploadFile);
exports.fileRouter.post('/batch-delete', file_controller_1.batchDeleteFiles);
exports.fileRouter.get('/trash', file_controller_1.getDeletedFiles);
exports.fileRouter.get('/', file_controller_1.getFiles);
exports.fileRouter.get('/:id', file_controller_1.getFileById);
exports.fileRouter.get('/:id/download', file_controller_1.downloadFile);
exports.fileRouter.get('/:id/versions', file_controller_1.getFileVersions);
exports.fileRouter.get('/:id/versions/:versionId/download', file_controller_1.downloadFileVersion);
exports.fileRouter.post('/:id/versions/:versionId/restore', file_controller_1.restoreFileVersion);
exports.fileRouter.get('/:id/audit-logs', file_controller_1.getFileAuditLogs);
exports.fileRouter.patch('/:id', file_controller_1.renameFile);
exports.fileRouter.patch('/:id/restore', file_controller_1.restoreFile);
exports.fileRouter.delete('/:id', file_controller_1.deleteFile);
//# sourceMappingURL=file.router.js.map