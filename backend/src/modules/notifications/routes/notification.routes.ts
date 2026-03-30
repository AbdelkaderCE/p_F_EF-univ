import { Router } from "express";
import {
  clearMyNotifications,
  deleteMyNotification,
  getMyNotifications,
  getMyUnreadCount,
  markAllMyNotificationsAsRead,
  markMyNotificationAsRead,
} from "../../../controllers/notifications/notification.controller";
import { requireAuth } from "../../../middlewares/auth.middleware";

const router = Router();

router.use(requireAuth);

router.get("/", getMyNotifications);
router.get("/unread-count", getMyUnreadCount);
router.put("/:id/read", markMyNotificationAsRead);
router.put("/read-all", markAllMyNotificationsAsRead);
router.delete("/:id", deleteMyNotification);
router.delete("/", clearMyNotifications);

export default router;
