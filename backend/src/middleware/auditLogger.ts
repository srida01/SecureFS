import { Response, NextFunction } from 'express';
import { AuthRequest } from './authenticate';
import { prisma } from '../utils/prisma';
import { AuditAction, AuditStatus } from '@prisma/client';

export const createAuditLog = async (
  actorId: string,
  action: AuditAction,
  resourceId?: string,
  resourceType?: string,
  metadata?: object,
  status: AuditStatus = 'success',
  ipAddress?: string
) => {
  await prisma.auditLog.create({
    data: {
      actorId,
      action,
      resourceId,
      resourceType,
      metadata: metadata || undefined,
      status,
      ipAddress,
    },
  });
};