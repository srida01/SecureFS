"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
require("express-async-errors");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const path_1 = __importDefault(require("path"));
const auth_router_1 = require("./modules/auth/auth.router");
const file_router_1 = require("./modules/files/file.router");
const folder_router_1 = require("./modules/folders/folder.router");
const permission_router_1 = require("./modules/permissions/permission.router");
const search_router_1 = require("./modules/search/search.router");
const admin_router_1 = require("./modules/admin/admin.router");
const audit_router_1 = require("./modules/audit-logs/audit.router");
const shareLink_router_1 = require("./modules/share-links/shareLink.router");
const trash_router_1 = require("./modules/trash/trash.router");
const errorHandler_1 = require("./middleware/errorHandler");
const logger_1 = require("./utils/logger");
const validateEnv_1 = require("./utils/validateEnv");
// BigInt serialization fix
BigInt.prototype.toJSON = function () {
    return this.toString();
};
dotenv_1.default.config();
(0, validateEnv_1.validateEnvironment)();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Security middleware
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            frameAncestors: ["'self'", "http://localhost:5173"],
        },
    },
}));
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Serve uploaded files if using local storage
if (process.env.USE_LOCAL_STORAGE === 'true') {
    app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
}
// Routes
app.use('/api/auth', auth_router_1.authRouter);
app.use('/api/files', file_router_1.fileRouter);
app.use('/api/folders', folder_router_1.folderRouter);
app.use('/api/permissions', permission_router_1.permissionRouter);
app.use('/api/search', search_router_1.searchRouter);
app.use('/api/audit-logs', audit_router_1.auditRouter);
app.use('/api/share-links', shareLink_router_1.shareLinkRouter);
app.use('/api/trash', trash_router_1.trashRouter);
app.use('/api/admin', admin_router_1.adminRouter);
// Health check
app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'Server is running', timestamp: new Date() });
});
// Error handler (must be last)
app.use(errorHandler_1.errorHandler);
app.listen(PORT, () => {
    logger_1.logger.info(`Server running on port ${PORT}`);
});
exports.default = app;
//# sourceMappingURL=index.js.map