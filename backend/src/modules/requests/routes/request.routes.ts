import { Router } from "express";
import {
  createReclamation,
  getMyReclamations,
  createJustification,
  getMyJustifications,
  getReclamationTypes,
  getJustificationTypes,
  getAdminRequestsInbox,
  decideReclamation,
  decideJustification,
} from "../../../controllers/requests/request.controller";
import { requireAuth, requireRole } from "../../../middlewares/auth.middleware";
import {
  validateReclamation,
  validateJustification,
} from "../validators/request.validator";

const router = Router();

// ── Types (pour remplir les selects du formulaire) ──────────
router.get("/types/reclamations", getReclamationTypes);
router.get("/types/justifications", getJustificationTypes);

// ── Reclamations ────────────────────────────────────────────
router.post("/reclamations", requireAuth, validateReclamation, createReclamation);
router.get("/reclamations", requireAuth, getMyReclamations);

// ── Justifications ──────────────────────────────────────────
router.post("/justifications", requireAuth, validateJustification, createJustification);
router.get("/justifications", requireAuth, getMyJustifications);

// ── Admin processing ────────────────────────────────────────
router.get("/admin/inbox", requireAuth, requireRole(["admin", "vice_doyen"]), getAdminRequestsInbox);
router.post("/admin/reclamations/:id/decision", requireAuth, requireRole(["admin", "vice_doyen"]), decideReclamation);
router.post("/admin/justifications/:id/decision", requireAuth, requireRole(["admin", "vice_doyen"]), decideJustification);

export default router;