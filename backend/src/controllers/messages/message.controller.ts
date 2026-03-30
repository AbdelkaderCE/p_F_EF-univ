import { Response } from "express";
import { AuthRequest } from "../../middlewares/auth.middleware";
import {
  MessageMode,
  MessageServiceError,
  getMessagingCapabilities,
  getUserInbox,
  sendMessage,
} from "../../modules/messages/services/message.service";

const getUser = (req: AuthRequest, res: Response) => {
  if (!req.user?.id) {
    res.status(401).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required" },
    });
    return null;
  }

  return req.user;
};

const handleError = (res: Response, error: unknown, fallbackMessage: string) => {
  if (error instanceof MessageServiceError) {
    res.status(error.statusCode).json({
      success: false,
      error: { code: "MESSAGING_ERROR", message: error.message },
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: { code: "INTERNAL_ERROR", message: fallbackMessage },
  });
};

export const getMyInboxHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = getUser(req, res);
    if (!user) return;

    const data = await getUserInbox(user.id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    handleError(res, error, "Failed to fetch inbox");
  }
};

export const getMessagingCapabilitiesHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = getUser(req, res);
    if (!user) return;

    const data = await getMessagingCapabilities(user.id, user.roles || []);
    res.status(200).json({ success: true, data });
  } catch (error) {
    handleError(res, error, "Failed to fetch messaging capabilities");
  }
};

export const sendMessageHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = getUser(req, res);
    if (!user) return;

    const mode = String(req.body?.mode || "").toLowerCase() as MessageMode;
    if (mode !== "unicast" && mode !== "broadcast") {
      res.status(400).json({
        success: false,
        error: { code: "BAD_REQUEST", message: "mode must be unicast or broadcast" },
      });
      return;
    }

    const result = await sendMessage({
      senderUserId: user.id,
      senderRoles: user.roles || [],
      mode,
      recipientUserId: req.body?.recipientUserId,
      title: req.body?.title,
      content: req.body?.content,
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    handleError(res, error, "Failed to send message");
  }
};
