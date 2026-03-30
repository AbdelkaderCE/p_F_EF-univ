import { Router } from "express";
import { requireAuth, requireRole } from "../../../middlewares/auth.middleware";
import {
  getTeacherCoursesHandler,
  getCourseGroupsHandler,
} from "../../../controllers/pfe/pfe.controller";

const router = Router();

router.get(
  "/teacher/:teacherId/courses",
  requireAuth,
  requireRole(["admin", "vice_doyen", "enseignant"]),
  getTeacherCoursesHandler
);

router.get(
  "/course/:courseId/groups",
  requireAuth,
  requireRole(["admin", "vice_doyen", "enseignant"]),
  getCourseGroupsHandler
);

export default router;
