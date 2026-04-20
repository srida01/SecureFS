"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchRouter = void 0;
const express_1 = require("express");
const authenticate_1 = require("../../middleware/authenticate");
const search_controller_1 = require("./search.controller");
exports.searchRouter = (0, express_1.Router)();
exports.searchRouter.use(authenticate_1.authenticate);
exports.searchRouter.get('/', search_controller_1.searchFiles);
//# sourceMappingURL=search.router.js.map