import { Router } from "express";
import { requireAuth, requireRole } from "../../../middlewares/auth.middleware";
import {
  chooseSpecialiteHandler,
  getMySpecialiteChoicesHandler,
  getSpecialiteOptionsHandler,
  getStudentDeadlinesHandler,
  getStudentDocumentsHandler,
  getStudentNotesHandler,
  getStudentProfileHandler,
  getStudentSpecialtiesHandler,
} from "../../../controllers/student/student.controller";

const router = Router();

router.use(requireAuth);
router.use(requireRole(["etudiant", "delegue", "admin"]));

router.get("/profile", getStudentProfileHandler);
router.get("/specialties", getStudentSpecialtiesHandler);
router.get("/deadlines", getStudentDeadlinesHandler);
router.get("/documents", getStudentDocumentsHandler);
router.get("/notes", getStudentNotesHandler);
router.get("/specialite-options", getSpecialiteOptionsHandler);
router.get("/my-choices", getMySpecialiteChoicesHandler);
router.post("/choose-specialite", chooseSpecialiteHandler);

export default router;
