import nodemailer from 'nodemailer';
import { logger } from '../../../shared/utils/logger';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const baseTemplate = (content: string) => `
<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body { font-family: 'DM Sans', Arial, sans-serif; background: #F8FAFC; margin: 0; padding: 0; }
  .wrapper { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
  .header { background: linear-gradient(135deg, #0A0F1E 0%, #1E3A5F 100%); padding: 32px 40px; }
  .header h1 { color: #3B82F6; font-size: 24px; margin: 0; letter-spacing: -0.5px; }
  .header p { color: rgba(255,255,255,0.6); margin: 4px 0 0; font-size: 13px; }
  .body { padding: 32px 40px; color: #374151; }
  .body h2 { color: #111827; font-size: 20px; }
  .cta { display: inline-block; background: linear-gradient(135deg, #3B82F6, #6366F1); color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px; }
  .footer { background: #F8FAFC; padding: 20px 40px; text-align: center; color: #9CA3AF; font-size: 12px; border-top: 1px solid #E5E7EB; }
  .otp-box { background: #EFF6FF; border: 2px solid #3B82F6; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
  .otp { font-size: 36px; font-weight: 700; color: #1D4ED8; letter-spacing: 8px; }
</style></head>
<body><div class="wrapper">${content}<div class="footer">© ${new Date().getFullYear()} HRMS • This is an automated message</div></div></body></html>`;

export class EmailService {
  async send(to: string, subject: string, html: string) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"HRMS" <noreply@hrms.com>',
        to, subject, html,
      });
      logger.info(`Email sent to ${to}: ${subject}`);
    } catch (err) {
      logger.error('Email send failed:', err);
    }
  }

  async sendPasswordReset(email: string, otp: string) {
    const html = baseTemplate(`
      <div class="header"><h1>HRMS</h1><p>Password Reset</p></div>
      <div class="body">
        <h2>Reset your password</h2>
        <p>You requested a password reset. Use the OTP below (valid for 15 minutes):</p>
        <div class="otp-box"><div class="otp">${otp}</div></div>
        <p>If you didn't request this, please ignore this email.</p>
      </div>`);
    await this.send(email, 'Password Reset OTP — HRMS', html);
  }

  async sendPayslip(email: string, name: string, month: string, pdfBuffer: Buffer) {
    const html = baseTemplate(`
      <div class="header"><h1>HRMS</h1><p>Payslip</p></div>
      <div class="body">
        <h2>Hi ${name},</h2>
        <p>Your payslip for <strong>${month}</strong> is attached to this email.</p>
        <p>Please find your detailed earnings and deductions in the attached PDF.</p>
      </div>`);
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"HRMS" <noreply@hrms.com>',
        to: email,
        subject: `Payslip for ${month} — HRMS`,
        html,
        attachments: [{ filename: `payslip-${month.replace(' ', '-')}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }],
      });
    } catch (err) { logger.error('Payslip email failed:', err); }
  }

  async sendLeaveNotification(email: string, name: string, action: string, leaveType: string, dates: string) {
    const html = baseTemplate(`
      <div class="header"><h1>HRMS</h1><p>Leave ${action}</p></div>
      <div class="body">
        <h2>Hi ${name},</h2>
        <p>Your <strong>${leaveType}</strong> leave request for <strong>${dates}</strong> has been <strong>${action.toLowerCase()}</strong>.</p>
      </div>`);
    await this.send(email, `Leave ${action} — HRMS`, html);
  }
}

export const emailService = new EmailService();
