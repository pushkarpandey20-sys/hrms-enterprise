import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { logger } from './shared/utils/logger';
import { errorHandler } from './shared/middleware/errorHandler';
import { requestLogger } from './shared/middleware/requestLogger';

// Routes
import authRoutes from './modules/auth/routes/auth.routes';
import employeeRoutes from './modules/employees/routes/employee.routes';
import attendanceRoutes from './modules/attendance/routes/attendance.routes';
import leaveRoutes from './modules/leave/routes/leave.routes';
import payrollRoutes from './modules/payroll/routes/payroll.routes';
import assetRoutes from './modules/assets/routes/asset.routes';
import reportRoutes from './modules/reports/routes/report.routes';
import notificationRoutes from './modules/notifications/routes/notification.routes';
import announcementRoutes from './modules/announcements/routes/announcement.routes';
import dashboardRoutes from './modules/dashboard/routes/dashboard.routes';
import rbacRoutes from './modules/rbac/routes/rbac.routes';
import repairRoutes from './modules/repair/routes/repair.routes';
import performanceRoutes from './modules/performance/routes/performance.routes';
import helpdeskRoutes from './modules/helpdesk/routes/helpdesk.routes';
import offboardingRoutes from './modules/offboarding/routes/offboarding.routes';

const app: Application = express();

// Trust proxy
app.set('trust proxy', 1);

// Security
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));

// CORS
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    process.env.MOBILE_URL || 'exp://localhost:19000',
    /\.expo\.dev$/,
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Refresh-Token'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts, please try again later.' },
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(compression());

// Logging
app.use(morgan('combined', {
  stream: { write: (msg) => logger.http(msg.trim()) }
}));
app.use(requestLogger);

// Health check (both paths for Railway + direct)
const healthHandler = (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '2.0.0' });
};
app.get('/health', healthHandler);
app.get('/api/v1/health', healthHandler);

// API Routes
const API = '/api/v1';
app.use(`${API}/auth`, authLimiter, authRoutes);
app.use(`${API}/employees`, employeeRoutes);
app.use(`${API}/attendance`, attendanceRoutes);
app.use(`${API}/leave`, leaveRoutes);
app.use(`${API}/payroll`, payrollRoutes);
app.use(`${API}/assets`, assetRoutes);
app.use(`${API}/reports`, reportRoutes);
app.use(`${API}/notifications`, notificationRoutes);
app.use(`${API}/announcements`, announcementRoutes);
app.use(`${API}/dashboard`, dashboardRoutes);
app.use(`${API}/rbac`, rbacRoutes);
app.use(`${API}/repair`, repairRoutes);
app.use(`${API}/performance`, performanceRoutes);
app.use(`${API}/helpdesk`, helpdeskRoutes);
app.use(`${API}/offboarding`, offboardingRoutes);

// 404
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use(errorHandler);

export default app;
