import { Router } from "express";
import {
  createDocumentType,
  createRequest,
  deleteDocument,
  downloadDocument,
  getDocuments,
  uploadDocument,
} from "../../../controllers/documents/documents.controller";
import { requireAuth, requireRole } from "../../../middlewares/auth.middleware";
import upload from "../../../middlewares/upload.middleware";

const router = Router();

router.get("/", getDocuments);
router.post("/request", requireAuth, createRequest);
router.post("/upload", requireAuth, requireRole(["admin"]), upload.single("file"), uploadDocument);
router.post("/type", requireAuth, requireRole(["admin"]), createDocumentType);
router.get("/download/:id", requireAuth, downloadDocument);
router.delete("/:id", requireAuth, deleteDocument);

export default router;
