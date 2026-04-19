import { Response } from 'express';
import { AuthRequest } from '../../middleware/authenticate';
import { prisma } from '../../utils/prisma';
import { AppError } from '../../middleware/errorHandler';

export const getMyAuditLogs = async (req: AuthRequest, res: Response) => {
  const { page = '1', limit = '50' } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const logs = await prisma.auditLog.findMany({
    where: { actorId: req.userId },
    include: { actor: { select: { id: true, clerkUserId: true, role: true } } },
    orderBy: { createdAt: 'desc' },
    skip,
    take: Number(limit),
  });

  res.json({ success: true, data: logs });
};

export const exportMyAuditLogs = async (req: AuthRequest, res: Response) => {
  const { format = 'json' } = req.query;
  const logs = await prisma.auditLog.findMany({
    where: { actorId: req.userId },
    include: { actor: { select: { id: true, clerkUserId: true, role: true } } },
    orderBy: { createdAt: 'desc' },
  });

  if (String(format).toLowerCase() === 'csv') {
    const header = ['id', 'action', 'resourceType', 'resourceId', 'status', 'ipAddress', 'createdAt', 'metadata'];
    const rows = logs.map((log) => [
      log.id,
      log.action,
      log.resourceType || '',
      log.resourceId || '',
      log.status,
      log.ipAddress || '',
      log.createdAt.toISOString(),
      log.metadata ? JSON.stringify(log.metadata) : '',
    ]);
    const csv = [header.join(','), ...rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
    return res.send(csv);
  }

  if (String(format).toLowerCase() !== 'json') {
    throw new AppError(400, 'Invalid export format');
  }

  res.json({ success: true, data: logs });
};
