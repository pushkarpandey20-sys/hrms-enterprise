import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';

export const auditLog = (module: string, action: string) =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (req.user) {
        await prisma.auditLog.create({
          data: {
            userId: req.user.userId,
            employeeId: req.user.employeeId,
            action,
            module,
            entityId: req.params.id,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
          },
        }).catch(() => {}); // non-blocking
      }
    } catch {}
    next();
  };
