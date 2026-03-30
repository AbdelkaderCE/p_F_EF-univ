import { Router } from "express";
import { requireAuth, requireRole } from "../../../middlewares/auth.middleware";
import {
  getTeacherDashboardHandler,
  getTeacherStudentsByModuleHandler,
  markTeacherStudentAttendanceHandler,
  saveTeacherStudentNotesHandler,
  setTeacherStudentExclusionOverrideHandler,
} from "../../../controllers/dashboard/teacher-dashboard.controller";

const router = Router();

router.get(
  "/teacher",
  requireAuth,
  requireRole(["enseignant", "teacher", "admin", "vice_doyen"]),
  getTeacherDashboardHandler
);

router.get(
  "/teacher/students/module/:enseignementId",
  requireAuth,
  requireRole(["enseignant", "teacher", "admin", "vice_doyen"]),
  getTeacherStudentsByModuleHandler
);

router.post(
  "/teacher/students/notes",
  requireAuth,
  requireRole(["enseignant", "teacher", "admin", "vice_doyen"]),
  saveTeacherStudentNotesHandler
);

router.post(
  "/teacher/students/attendance",
  requireAuth,
  requireRole(["enseignant", "teacher", "admin", "vice_doyen"]),
  markTeacherStudentAttendanceHandler
);

router.put(
  "/teacher/students/exclusion/:etudiantId",
  requireAuth,
  requireRole(["enseignant", "teacher", "admin", "vice_doyen"]),
  setTeacherStudentExclusionOverrideHandler
);

export default router;
