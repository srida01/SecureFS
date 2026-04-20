import { Request, Response, NextFunction } from 'express';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { prisma } from '../utils/prisma';
import { AppError } from './errorHandler';
import { logger } from '../utils/logger';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
  clerkUserId?: string;
  userRole?: string;
  file?: Express.Multer.File;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError(401, 'No token provided');
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify with Clerk
    const payload = await clerkClient.verifyToken(token);
    const clerkUserId = payload.sub;

    // Find or create user in our DB
    let user = await prisma.user.findUnique({ where: { clerkUserId } });
    if (!user) {
      user = await prisma.user.create({
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
  } catch (err) {
    // Decode token header for debugging key ID mismatch
    const decodedHeader = jwt.decode(token, { complete: true })?.header;
    const tokenKid = decodedHeader?.kid;
    
    logger.error('Token verification failed', {
      error: err instanceof Error ? err.message : 'Unknown error',
      tokenStart: token?.substring(0, 20),
      tokenKid,
      clerkSecretKeySet: !!process.env.CLERK_SECRET_KEY,
    });
    
    // Provide more specific error message for kid mismatch
    if (err instanceof Error && err.message.includes('kid')) {
      throw new AppError(401, 'Token key ID mismatch - ensure backend and frontend use the same Clerk instance');
    }
    
    throw new AppError(401, 'Invalid or expired token');
  }
};

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.userRole !== 'admin') {
    throw new AppError(403, 'Admin access required');
  }
  next();
};