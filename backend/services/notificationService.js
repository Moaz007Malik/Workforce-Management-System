import { v4 as uuidv4 } from 'uuid';
import { repos } from '../repositories/index.js';

const notificationRepo = repos.notifications;

export async function createNotification(type, title, message, userId = 'all', metadata = {}) {
  const notification = {
    id: uuidv4(),
    type,
    title,
    message,
    userId,
    metadata,
    read: false,
    createdAt: new Date().toISOString(),
  };
  await notificationRepo.create(notification);
  return notification;
}

export async function getNotifications(userId = 'all') {
  const notifications = await notificationRepo.getAll();
  return notifications
    .filter((n) => n.userId === userId || n.userId === 'all')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function markAsRead(id) {
  return notificationRepo.update(id, { read: true });
}

export async function markAllAsRead(userId = 'all') {
  const notifications = await notificationRepo.getAll();
  await Promise.all(
    notifications
      .filter((n) => (n.userId === userId || n.userId === 'all') && !n.read)
      .map((n) => notificationRepo.update(n.id, { read: true }))
  );
}
