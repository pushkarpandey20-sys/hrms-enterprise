import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError';
import { prisma } from '../../config/database';
import { UserRole } from '@prisma/client';

export interface JwtPayload {
  userId: string;
  organizationId: string;
  role: UserRole;
  employeeId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw ApiError.unauthorized('No token provided');
    }
    const token = authHeader.substring(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, isActive: true, organizationId: true, role: true, employeeId: true },
    });

    if (!user || !user.isActive) throw ApiError.unauthorized('Account inactive or not found');

    req.user = {
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
      employeeId: user.employeeId || undefined,
    };
    next();
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      next(ApiError.unauthorized('Invalid token'));
    } else {
      next(err);
    }
  }
};

export const authorize = (...roles: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw ApiError.forbidden('Insufficient permissions');
    }
    next();
  };
