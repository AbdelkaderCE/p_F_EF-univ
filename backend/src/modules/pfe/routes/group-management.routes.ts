import { Router } from "express";
import {
  getGroupStudentsHandler,
  searchAvailableStudentsHandler,
  bulkAssignStudentsHandler,
  removeStudentHandler,
  setGroupLeaderHandler,
  getGroupWithTeacherHandler,
} from "../../../controllers/pfe/pfe-group.controller";
import { requireAuth, requireRole } from "../../../middlewares/auth.middleware";

const router = Router();

/**
 * ==================== PFE GROUP MANAGEMENT ROUTES ====================
 * All routes require authentication and admin role
 */

// ── Get group students (view) ───────────────────────────────────
router.get(
  "/:groupId/students",
  requireAuth,
  requireRole(["admin", "vice_doyen", "enseignant"]),
  getGroupStudentsHandler
);

// ── Search available students (with auto-exclude) ──────────────
router.get(
  "/students/search",
  requireAuth,
  requireRole(["admin", "vice_doyen"]),
  searchAvailableStudentsHandler
);

// ── Get group with teacher info ────────────────────────────────
router.get(
  "/:groupId/with-teacher",
  requireAuth,
  requireRole(["admin", "vice_doyen"]),
  getGroupWithTeacherHandler
);

// ── Bulk assign students ───────────────────────────────────────
router.post(
  "/:groupId/assign-students",
  requireAuth,
  requireRole(["admin", "vice_doyen"]),
  bulkAssignStudentsHandler
);

// ── Remove student from group ──────────────────────────────────
router.delete(
  "/:groupId/students/:studentId",
  requireAuth,
  requireRole(["admin", "vice_doyen"]),
  removeStudentHandler
);

// ── Set group leader ───────────────────────────────────────────
router.put(
  "/:groupId/leader/:studentId",
  requireAuth,
  requireRole(["admin", "vice_doyen"]),
  setGroupLeaderHandler
);

export default router;
