import logger from "../../utils/logger";

export interface NotificationData {
  userId: number;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  read?: boolean;
}

interface StoredNotification extends NotificationData {
  id: number;
  createdAt: Date;
  updatedAt: Date;
}

let nextId = 1;
const store: StoredNotification[] = [];

export const createNotification = async (data: NotificationData) => {
  try {
    const now = new Date();
    const notification: StoredNotification = {
      id: nextId++,
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      metadata: data.metadata,
      read: data.read ?? false,
      createdAt: now,
      updatedAt: now,
    };

    store.push(notification);
    return notification;
  } catch (error) {
    logger.error("Error creating notification:", error);
    throw error;
  }
};

export const getUserNotifications = async (
  userId: number,
  skip?: number,
  take?: number
) => {
  const _skip = skip ?? 0;
  const _take = take ?? 10;

  try {
    const userNotifications = store
      .filter((item) => item.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const notifications = userNotifications.slice(_skip, _skip + _take);
    const total = userNotifications.length;

    return {
      notifications,
      total,
      pages: Math.ceil(total / _take),
      currentPage: Math.floor(_skip / _take) + 1,
    };
  } catch (error) {
    logger.error("Error fetching user notifications:", error);
    throw error;
  }
};

export const markAsRead = async (notificationId: number) => {
  try {
    const target = store.find((item) => item.id === notificationId);
    if (!target) {
      throw new Error("Notification not found");
    }

    target.read = true;
    target.updatedAt = new Date();
    return target;
  } catch (error) {
    logger.error("Error marking notification as read:", error);
    throw error;
  }
};

export const markAllAsRead = async (userId: number) => {
  try {
    let count = 0;
    const now = new Date();

    store.forEach((item) => {
      if (item.userId === userId && !item.read) {
        item.read = true;
        item.updatedAt = now;
        count += 1;
      }
    });

    return { count };
  } catch (error) {
    logger.error("Error marking all notifications as read:", error);
    throw error;
  }
};

export const deleteNotification = async (notificationId: number) => {
  try {
    const idx = store.findIndex((item) => item.id === notificationId);
    if (idx === -1) {
      throw new Error("Notification not found");
    }

    const [removed] = store.splice(idx, 1);
    return removed;
  } catch (error) {
    logger.error("Error deleting notification:", error);
    throw error;
  }
};

export const deleteAllNotifications = async (userId: number) => {
  try {
    const before = store.length;
    for (let i = store.length - 1; i >= 0; i -= 1) {
      if (store[i].userId === userId) {
        store.splice(i, 1);
      }
    }
    return { count: before - store.length };
  } catch (error) {
    logger.error("Error deleting all notifications:", error);
    throw error;
  }
};

export const getUnreadCount = async (userId: number): Promise<number> => {
  try {
    return store.filter((item) => item.userId === userId && !item.read).length;
  } catch (error) {
    logger.error("Error getting unread notifications count:", error);
    throw error;
  }
};

export const broadcastNotification = async (
  userIds: number[],
  type: string,
  title: string,
  message: string,
  metadata?: Record<string, unknown>
) => {
  try {
    const created = await Promise.all(
      userIds.map((userId) =>
        createNotification({ userId, type, title, message, metadata, read: false })
      )
    );

    return {
      count: created.length,
    };
  } catch (error) {
    logger.error("Error broadcasting notifications:", error);
    throw error;
  }
};
