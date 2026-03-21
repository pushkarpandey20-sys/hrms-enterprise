import { Request, Response } from 'express';
import { asyncHandler } from '../../../shared/utils/asyncHandler';
import { authService } from '../services/auth.service';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  deviceInfo: z.string().optional(),
});

const mfaSchema = z.object({
  mfaToken: z.string(),
  code: z.string().length(6),
});

const forgotSchema = z.object({ email: z.string().email() });
const resetSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
  newPassword: z.string().min(8),
});
const changePassSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8),
});

export const authController = {
  login: asyncHandler(async (req: Request, res: Response) => {
    const { email, password, deviceInfo } = loginSchema.parse(req.body);
    const result = await authService.login(email, password, deviceInfo);
    res.json({ success: true, data: result });
  }),

  verifyMfa: asyncHandler(async (req: Request, res: Response) => {
    const { mfaToken, code } = mfaSchema.parse(req.body);
    const result = await authService.verifyMfa(mfaToken, code, req.body.deviceInfo);
    res.json({ success: true, data: result });
  }),

  refreshToken: asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new Error('Refresh token required');
    const result = await authService.refreshToken(refreshToken);
    res.json({ success: true, data: result });
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    if (refreshToken) await authService.logout(refreshToken);
    res.json({ success: true, message: 'Logged out' });
  }),

  setupMfa: asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.setupMfa(req.user!.userId);
    res.json({ success: true, data: result });
  }),

  enableMfa: asyncHandler(async (req: Request, res: Response) => {
    const { code } = z.object({ code: z.string().length(6) }).parse(req.body);
    await authService.enableMfa(req.user!.userId, code);
    res.json({ success: true, message: 'MFA enabled' });
  }),

  forgotPassword: asyncHandler(async (req: Request, res: Response) => {
    const { email } = forgotSchema.parse(req.body);
    await authService.forgotPassword(email);
    res.json({ success: true, message: 'If account exists, OTP has been sent' });
  }),

  resetPassword: asyncHandler(async (req: Request, res: Response) => {
    const data = resetSchema.parse(req.body);
    await authService.resetPassword(data.email, data.otp, data.newPassword);
    res.json({ success: true, message: 'Password reset successful' });
  }),

  changePassword: asyncHandler(async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = changePassSchema.parse(req.body);
    await authService.changePassword(req.user!.userId, currentPassword, newPassword);
    res.json({ success: true, message: 'Password changed' });
  }),

  getProfile: asyncHandler(async (req: Request, res: Response) => {
    const { prisma } = await import('../../../config/database');
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { employee: true, permissions: true },
    });
    res.json({ success: true, data: user });
  }),
};
