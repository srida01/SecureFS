"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shareLinkRouter = void 0;
const express_1 = require("express");
const authenticate_1 = require("../../middleware/authenticate");
const shareLink_controller_1 = require("./shareLink.controller");
exports.shareLinkRouter = (0, express_1.Router)();
exports.shareLinkRouter.post('/', authenticate_1.authenticate, shareLink_controller_1.createShareLink);
exports.shareLinkRouter.get('/:token', shareLink_controller_1.getShareLink);
exports.shareLinkRouter.get('/:token/download', shareLink_controller_1.downloadSharedFile);
exports.shareLinkRouter.post('/:token/claim', authenticate_1.authenticate, shareLink_controller_1.claimSharedAccess);
//# sourceMappingURL=shareLink.router.js.map