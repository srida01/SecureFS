"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = exports.authenticate = void 0;
const clerk_sdk_node_1 = require("@clerk/clerk-sdk-node");
const prisma_1 = require("../utils/prisma");
const errorHandler_1 = require("./errorHandler");
const logger_1 = require("../utils/logger");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new errorHandler_1.AppError(401, 'No token provided');
    }
    const token = authHeader.split(' ')[1];
    try {
        // Verify with Clerk
        const payload = await clerk_sdk_node_1.clerkClient.verifyToken(token);
        const clerkUserId = payload.sub;
        // Find or create user in our DB
        let user = await prisma_1.prisma.user.findUnique({ where: { clerkUserId } });
        if (!user) {
            user = await prisma_1.prisma.user.create({
                data: {
                    clerkUserId,
                    role: 'viewer',
                    storageQuota: { create: { quotaBytes: BigInt(10737418240) } },
                },
            });
        }
        req.userId = user.id;
        req.clerkUserId = clerkUserId;
        req.userRole = user.role;
        next();
    }
    catch (err) {
        // Decode token header for debugging key ID mismatch
        const decodedHeader = jsonwebtoken_1.default.decode(token, { complete: true })?.header;
        const tokenKid = decodedHeader?.kid;
        logger_1.logger.error('Token verification failed', {
            error: err instanceof Error ? err.message : 'Unknown error',
            tokenStart: token?.substring(0, 20),
            tokenKid,
            clerkSecretKeySet: !!process.env.CLERK_SECRET_KEY,
        });
        // Provide more specific error message for kid mismatch
        if (err instanceof Error && err.message.includes('kid')) {
            throw new errorHandler_1.AppError(401, 'Token key ID mismatch - ensure backend and frontend use the same Clerk instance');
        }
        throw new errorHandler_1.AppError(401, 'Invalid or expired token');
    }
};
exports.authenticate = authenticate;
const requireAdmin = (req, res, next) => {
    if (req.userRole !== 'admin') {
        throw new errorHandler_1.AppError(403, 'Admin access required');
    }
    next();
};
exports.requireAdmin = requireAdmin;
//# sourceMappingURL=authenticate.js.map