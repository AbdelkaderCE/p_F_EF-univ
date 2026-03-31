import { Router } from "express";
import { requireAuth, requireRole } from "../../../middlewares/auth.middleware";
import {
  addMembreHandler,
  createConseilHandler,
  createDossierHandler,
  deleteConseilHandler,
  deleteDossierHandler,
  finaliserConseilHandler,
  getConseilHandler,
  getDisciplineStudentProfileHandler,
  getDossierHandler,
  listDisciplineStudentsHandler,
  listConseilsHandler,
  listDecisionsHandler,
  listDossiersHandler,
  listInfractionsHandler,
  removeMembreHandler,
  scheduleMeetingHandler,
  statsHandler,
  updateConseilHandler,
  updateDossierHandler,
  recordDecisionHandler,
} from "../../../controllers/discipline/discipline.controller";

const router = Router();

const disciplineRoles = ["admin", "vice_doyen", "enseignant"];

router.get("/conseils", requireAuth, requireRole(disciplineRoles), listConseilsHandler);
router.get("/conseils/:id", requireAuth, requireRole(disciplineRoles), getConseilHandler);
router.post("/conseils", requireAuth, requireRole(disciplineRoles), createConseilHandler);
router.patch("/conseils/:id", requireAuth, requireRole(disciplineRoles), updateConseilHandler);
router.delete("/conseils/:id", requireAuth, requireRole(disciplineRoles), deleteConseilHandler);
router.patch("/conseils/:id/finaliser", requireAuth, requireRole(disciplineRoles), finaliserConseilHandler);
router.post("/conseils/:cid/membres", requireAuth, requireRole(disciplineRoles), addMembreHandler);
router.delete("/conseils/:cid/membres/:mid", requireAuth, requireRole(disciplineRoles), removeMembreHandler);

router.get("/dossiers-disciplinaires", requireAuth, requireRole(disciplineRoles), listDossiersHandler);
router.get("/cases", requireAuth, requireRole(disciplineRoles), listDossiersHandler);
router.get("/dossiers-disciplinaires/:id", requireAuth, requireRole(disciplineRoles), getDossierHandler);
router.get("/cases/:id", requireAuth, requireRole(disciplineRoles), getDossierHandler);
router.post("/dossiers-disciplinaires", requireAuth, requireRole(disciplineRoles), createDossierHandler);
router.post("/cases", requireAuth, requireRole(disciplineRoles), createDossierHandler);
router.patch("/dossiers-disciplinaires/:id", requireAuth, requireRole(disciplineRoles), updateDossierHandler);
router.patch("/cases/:id", requireAuth, requireRole(disciplineRoles), updateDossierHandler);
router.delete("/dossiers-disciplinaires/:id", requireAuth, requireRole(disciplineRoles), deleteDossierHandler);
router.delete("/cases/:id", requireAuth, requireRole(disciplineRoles), deleteDossierHandler);

router.get("/infractions", requireAuth, requireRole(disciplineRoles), listInfractionsHandler);
router.get("/decisions", requireAuth, requireRole(disciplineRoles), listDecisionsHandler);
router.get("/students", requireAuth, requireRole(disciplineRoles), listDisciplineStudentsHandler);
router.get("/students/:id/profile", requireAuth, requireRole(disciplineRoles), getDisciplineStudentProfileHandler);

router.post("/meetings", requireAuth, requireRole(disciplineRoles), scheduleMeetingHandler);
router.get("/meetings", requireAuth, requireRole(disciplineRoles), listConseilsHandler);
router.post("/decisions", requireAuth, requireRole(disciplineRoles), recordDecisionHandler);
router.get("/stats", requireAuth, requireRole(disciplineRoles), statsHandler);

export default router;
