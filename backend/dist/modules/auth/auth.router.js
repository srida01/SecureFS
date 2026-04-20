"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const authenticate_1 = require("../../middleware/authenticate");
const auth_controller_1 = require("./auth.controller");
exports.authRouter = (0, express_1.Router)();
exports.authRouter.post('/sync', authenticate_1.authenticate, auth_controller_1.syncUser);
exports.authRouter.get('/me', authenticate_1.authenticate, auth_controller_1.getMe);
//# sourceMappingURL=auth.router.js.map