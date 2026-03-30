import { Router } from "express";
import {
  getMessagingCapabilitiesHandler,
  getMyInboxHandler,
  sendMessageHandler,
} from "../../../controllers/messages/message.controller";
import { requireAuth } from "../../../middlewares/auth.middleware";

const router = Router();

router.use(requireAuth);

router.get("/inbox", getMyInboxHandler);
router.get("/capabilities", getMessagingCapabilitiesHandler);
router.post("/send", sendMessageHandler);

export default router;
