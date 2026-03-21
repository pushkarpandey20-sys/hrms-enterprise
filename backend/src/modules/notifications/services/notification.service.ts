import { prisma } from '../../../config/database';
import { NotificationType } from '@prisma/client';

export class NotificationService {
  async create(data: { userId: string; title: string; message: string; type: NotificationType; referenceId?: string; referenceType?: string }) {
    const notif = await prisma.notification.create({ data });
    // Emit socket event (handled in socketServer)
    const { emitToUser } = await import('../../../sockets/socketServer').catch(() => ({ emitToUser: null }));
    if (emitToUser) emitToUser(data.userId, 'notification', notif);
    return notif;
  }

  async markRead(userId: string, notificationId: string) {
    return prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async getUnread(userId: string) {
    return prisma.notification.findMany({
      where: { userId, isRead: false },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async list(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({ where: { userId }, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.notification.count({ where: { userId } }),
    ]);
    return { notifications, total };
  }
}

export const notificationService = new NotificationService();
