import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { prisma } from '../../../config/database';
import { redis } from '../../../config/redis';
import { ApiError } from '../../../shared/utils/ApiError';
import { emailService } from '../../notifications/services/email.service';
import { JwtPayload } from '../../../shared/middleware/authenticate';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export class AuthService {
  generateAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES } as jwt.SignOptions);
  }

  generateRefreshToken(payload: JwtPayload): string {
    return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES } as jwt.SignOptions);
  }

  async login(email: string, password: string, deviceInfo?: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { employee: { select: { firstName: true, lastName: true, photoUrl: true } } },
    });

    if (!user) throw ApiError.unauthorized('Invalid credentials');
    if (!user.isActive) throw ApiError.unauthorized('Account is deactivated');

    // Check lock
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw ApiError.unauthorized(`Account locked until ${user.lockedUntil.toLocaleString()}`);
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      const failedCount = user.failedLoginCount + 1;
      const updateData: { failedLoginCount: number; lockedUntil?: Date } = {
        failedLoginCount: failedCount,
      };
      if (failedCount >= 5) {
        updateData.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 min
      }
      await prisma.user.update({ where: { id: user.id }, data: updateData });
      throw ApiError.unauthorized('Invalid credentials');
    }

    // Reset failed count
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    if (user.isMfaEnabled) {
      // Return temp token for MFA
      const mfaToken = uuidv4();
      await redis.setex(`mfa:${mfaToken}`, 300, user.id); // 5 min
      return { requiresMfa: true, mfaToken };
    }

    return this.createSession(user, deviceInfo);
  }

  async verifyMfa(mfaToken: string, totpCode: string, deviceInfo?: string) {
    const userId = await redis.get(`mfa:${mfaToken}`);
    if (!userId) throw ApiError.unauthorized('MFA session expired');

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.mfaSecret) throw ApiError.unauthorized('MFA not configured');

    const isValid = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: totpCode,
      window: 1,
    });
    if (!isValid) throw ApiError.unauthorized('Invalid TOTP code');

    await redis.del(`mfa:${mfaToken}`);
    return this.createSession(user, deviceInfo);
  }

  async createSession(user: { id: string; organizationId: string; role: any; employeeId: string | null }, deviceInfo?: string) {
    const payload: JwtPayload = {
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
      employeeId: user.employeeId || undefined,
    };

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    // Store refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({
      data: { userId: user.id, token: refreshToken, expiresAt, deviceInfo },
    });

    return { accessToken, refreshToken, user: payload };
  }

  async refreshToken(token: string) {
    const stored = await prisma.refreshToken.findUnique({ where: { token } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }

    const payload = jwt.verify(token, REFRESH_SECRET) as JwtPayload;
    const accessToken = this.generateAccessToken(payload);

    // Rotate refresh token
    const newRefreshToken = this.generateRefreshToken(payload);
    await prisma.$transaction([
      prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } }),
      prisma.refreshToken.create({
        data: {
          userId: stored.userId,
          token: newRefreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          deviceInfo: stored.deviceInfo,
        },
      }),
    ]);

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(refreshToken: string) {
    await prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { revokedAt: new Date() },
    });
  }

  async setupMfa(userId: string) {
    const secret = speakeasy.generateSecret({ length: 32, name: 'HRMS' });
    await prisma.user.update({ where: { id: userId }, data: { mfaSecret: secret.base32 } });
    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);
    return { secret: secret.base32, qrCode };
  }

  async enableMfa(userId: string, code: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.mfaSecret) throw ApiError.badRequest('MFA setup not initiated');

    const isValid = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });
    if (!isValid) throw ApiError.badRequest('Invalid TOTP code');

    await prisma.user.update({ where: { id: userId }, data: { isMfaEnabled: true } });
  }

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return; // Silent fail

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: otp, passwordResetExpiry: expiry },
    });

    await emailService.sendPasswordReset(email, otp);
  }

  async resetPassword(email: string, otp: string, newPassword: string) {
    const user = await prisma.user.findFirst({
      where: {
        email,
        passwordResetToken: otp,
        passwordResetExpiry: { gt: new Date() },
      },
    });
    if (!user) throw ApiError.badRequest('Invalid or expired OTP');

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, passwordResetToken: null, passwordResetExpiry: null },
    });

    // Revoke all refresh tokens
    await prisma.refreshToken.updateMany({
      where: { userId: user.id },
      data: { revokedAt: new Date() },
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw ApiError.notFound('User not found');

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) throw ApiError.badRequest('Current password is incorrect');

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  }
}

export const authService = new AuthService();
