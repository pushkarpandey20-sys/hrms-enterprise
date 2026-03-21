import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../shared/middleware/authenticate';
import { logger } from '../shared/utils/logger';

let io: SocketServer;
const userSockets = new Map<string, string[]>(); // userId -> socketIds

export function initSocket(server: HttpServer): void {
  io = new SocketServer(server, {
    cors: {
      origin: [process.env.FRONTEND_URL || 'http://localhost:3000', /\.expo\.dev$/],
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
      (socket as any).user = payload;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user as JwtPayload;
    logger.info(`Socket connected: ${user.userId}`);

    // Track user sockets
    const existing = userSockets.get(user.userId) || [];
    userSockets.set(user.userId, [...existing, socket.id]);

    socket.join(`org:${user.organizationId}`);
    socket.join(`user:${user.userId}`);

    socket.on('disconnect', () => {
      const sockets = userSockets.get(user.userId) || [];
      userSockets.set(user.userId, sockets.filter(id => id !== socket.id));
    });

    // Real-time attendance ping
    socket.on('attendance:ping', (data) => {
      socket.to(`org:${user.organizationId}`).emit('attendance:update', { userId: user.userId, ...data });
    });
  });
}

export function emitToUser(userId: string, event: string, data: unknown): void {
  if (io) io.to(`user:${userId}`).emit(event, data);
}

export function emitToOrg(orgId: string, event: string, data: unknown): void {
  if (io) io.to(`org:${orgId}`).emit(event, data);
}

export { io };
