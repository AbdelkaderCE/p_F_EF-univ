import { Response } from "express";
import prisma from "../../config/database";
import { AuthRequest } from "../../middlewares/auth.middleware";
import { StatusJustification, StatusReclamation } from "@prisma/client";
import { createNotification } from "../../services/common/notification.service";

// ─── Helper: récupérer Etudiant.id depuis User.id ───────────────────────────
const getEtudiantId = async (userId?: number): Promise<number | null> => {
  if (typeof userId === "number") {
    const etudiant = await prisma.etudiant.findFirst({
      where: { userId },
      select: { id: true },
    });
    if (etudiant) return etudiant.id;
  }

  return null;
};

const isAdminRole = (roles: string[] = []): boolean => {
  return roles.some((role) => ["admin", "vice_doyen"].includes(role));
};

const mapReclamationStatusToUi = (status: StatusReclamation, response?: string | null) => {
  if (status === StatusReclamation.traitee) return "resolved";
  if (status === StatusReclamation.refusee) return "rejected";
  if (response && response.includes("[INFO_REQUEST]")) return "info-requested";
  if (status === StatusReclamation.en_cours || status === StatusReclamation.en_attente) return "under-review";
  return "submitted";
};

const mapJustificationStatusToUi = (status: StatusJustification, comment?: string | null) => {
  if (status === StatusJustification.valide) return "resolved";
  if (status === StatusJustification.refuse) return "rejected";
  if (comment && comment.includes("[INFO_REQUEST]")) return "info-requested";
  if (status === StatusJustification.en_verification) return "under-review";
  return "submitted";
};

const DEFAULT_RECLAMATION_TYPES = [
  { nom: "Grade Error", description: "Issue related to marks or exam grading." },
  { nom: "Schedule Conflict", description: "Conflict in timetable or exam schedule." },
  { nom: "Administrative Error", description: "Administrative or registration issue." },
  { nom: "Other", description: "Other reclamation reasons." },
];

const DEFAULT_JUSTIFICATION_TYPES = [
  { nom: "Medical", description: "Medical reason with supporting document." },
  { nom: "Family Emergency", description: "Urgent family situation." },
  { nom: "Academic Overlap", description: "Overlap with another official academic activity." },
  { nom: "Administrative Reason", description: "Institutional or administrative reason." },
  { nom: "Other", description: "Other justification reasons." },
];

const ensureDefaultReclamationTypes = async () => {
  for (const item of DEFAULT_RECLAMATION_TYPES) {
    const existing = await prisma.reclamationType.findFirst({
      where: { nom: { equals: item.nom, mode: "insensitive" } },
      select: { id: true },
    });

    if (!existing) {
      await prisma.reclamationType.create({
        data: { nom: item.nom, description: item.description },
      });
    }
  }
};

const ensureDefaultJustificationTypes = async () => {
  for (const item of DEFAULT_JUSTIFICATION_TYPES) {
    const existing = await prisma.typeAbsence.findFirst({
      where: { nom: { equals: item.nom, mode: "insensitive" } },
      select: { id: true },
    });

    if (!existing) {
      await prisma.typeAbsence.create({
        data: { nom: item.nom, description: item.description },
      });
    }
  }
};

const getRelatedTeacherUserIds = async (etudiantId: number): Promise<number[]> => {
  const student = await prisma.etudiant.findUnique({
    where: { id: etudiantId },
    select: { promoId: true },
  });

  if (!student?.promoId) {
    return [];
  }

  const teachings = await prisma.enseignement.findMany({
    where: {
      promoId: student.promoId,
      enseignantId: { not: null },
    },
    select: {
      enseignant: {
        select: {
          userId: true,
        },
      },
    },
  });

  const ids = new Set<number>();
  teachings.forEach((teaching) => {
    const userId = teaching.enseignant?.userId;
    if (typeof userId === "number") {
      ids.add(userId);
    }
  });

  return Array.from(ids);
};

const notifyRequestDecision = async (
  etudiantId: number,
  category: "reclamation" | "justification",
  requestId: number,
  approved: boolean,
  adminComment?: string
) => {
  const student = await prisma.etudiant.findUnique({
    where: { id: etudiantId },
    select: {
      userId: true,
      user: {
        select: {
          nom: true,
          prenom: true,
        },
      },
    },
  });

  if (!student) {
    return;
  }

  const outcome = approved ? "accepted" : "rejected";
  const title = approved
    ? `${category === "reclamation" ? "Reclamation" : "Justification"} accepted`
    : `${category === "reclamation" ? "Reclamation" : "Justification"} rejected`;

  await createNotification({
    userId: student.userId,
    type: `request-${outcome}`,
    title,
    message: adminComment?.trim()
      ? adminComment.trim()
      : `Your ${category} request #${requestId} was ${outcome} by administration.`,
    metadata: {
      category,
      requestId,
      outcome,
    },
  });

  const teacherIds = await getRelatedTeacherUserIds(etudiantId);
  if (!teacherIds.length) {
    return;
  }

  const studentName = `${student.user.prenom ?? ""} ${student.user.nom ?? ""}`.trim() || "Student";
  await Promise.all(
    teacherIds.map((teacherId) =>
      createNotification({
        userId: teacherId,
        type: `request-${category}-decision`,
        title: `${category === "reclamation" ? "Reclamation" : "Justification"} ${outcome}`,
        message: `${studentName}'s ${category} request #${requestId} was ${outcome} by administration.`,
        metadata: {
          category,
          requestId,
          outcome,
          etudiantId,
        },
      })
    )
  );
};

const resolveReclamationTypeId = async (typeIdRaw: unknown, typeNameRaw: unknown): Promise<number> => {
  const parsedTypeId = Number(typeIdRaw);
  if (Number.isInteger(parsedTypeId) && parsedTypeId > 0) {
    const existing = await prisma.reclamationType.findUnique({
      where: { id: parsedTypeId },
      select: { id: true },
    });
    if (existing) return existing.id;
  }

  const typeName = String(typeNameRaw || "General").trim() || "General";

  const byName = await prisma.reclamationType.findFirst({
    where: { nom: { equals: typeName, mode: "insensitive" } },
    select: { id: true },
  });
  if (byName) return byName.id;

  const created = await prisma.reclamationType.create({
    data: { nom: typeName, description: "Auto-created by public request submission" },
    select: { id: true },
  });

  return created.id;
};

const resolveJustificationTypeId = async (typeIdRaw: unknown, typeNameRaw: unknown): Promise<number> => {
  const parsedTypeId = Number(typeIdRaw);
  if (Number.isInteger(parsedTypeId) && parsedTypeId > 0) {
    const existing = await prisma.typeAbsence.findUnique({
      where: { id: parsedTypeId },
      select: { id: true },
    });
    if (existing) return existing.id;
  }

  const typeName = String(typeNameRaw || "General").trim() || "General";

  const byName = await prisma.typeAbsence.findFirst({
    where: { nom: { equals: typeName, mode: "insensitive" } },
    select: { id: true },
  });
  if (byName) return byName.id;

  const created = await prisma.typeAbsence.create({
    data: { nom: typeName, description: "Auto-created by public justification submission" },
    select: { id: true },
  });

  return created.id;
};

// ════════════════════════════════════════════════════════════
//  RECLAMATIONS
// ════════════════════════════════════════════════════════════

// POST /api/v1/requests/reclamations
export const createReclamation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const etudiantId = await getEtudiantId(userId);

    if (!etudiantId) {
      res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Only students can submit reclamations" },
      });
      return;
    }

    const { typeId, typeName, objet, description, priorite } = req.body;
    const resolvedTypeId = await resolveReclamationTypeId(typeId, typeName);

    const reclamation = await prisma.reclamation.create({
      data: {
        etudiantId,
        typeId: resolvedTypeId,
        objet,
        description,
        priorite: priorite ?? "normale",
        status: "soumise",
      },
      include: {
        type: { select: { nom: true } },
        etudiant: {
          include: {
            user: { select: { nom: true, prenom: true, email: true } },
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "Reclamation submitted successfully",
      data: reclamation,
    });
  } catch (error) {
    console.error("createReclamation error:", error);
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
};

// GET /api/v1/requests/reclamations
export const getMyReclamations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const etudiantId = await getEtudiantId(userId);

    if (!etudiantId) {
      res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Only students can view reclamations" },
      });
      return;
    }

    const { status } = req.query;
    const where: any = { etudiantId };
    if (status) where.status = status;

    const reclamations = await prisma.reclamation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        type: { select: { nom: true } },
      },
    });

    // Stats pour les cartes du dashboard
    const all = await prisma.reclamation.findMany({
      where: { etudiantId },
      select: { status: true },
    });

    const stats = {
      total: all.length,
      pending: all.filter((r) => r.status === "soumise" || r.status === "en_cours").length,
      resolved: all.filter((r) => r.status === "traitee").length,
      rejected: all.filter((r) => r.status === "refusee").length,
    };

    res.status(200).json({
      success: true,
      data: reclamations,
      stats,
    });
  } catch (error) {
    console.error("getMyReclamations error:", error);
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
};

// GET /api/v1/requests/admin/inbox
export const getAdminRequestsInbox = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!isAdminRole(req.user?.roles)) {
      res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Only admin can access requests inbox" },
      });
      return;
    }

    const [reclamations, justifications] = await Promise.all([
      prisma.reclamation.findMany({
        include: {
          type: { select: { nom: true } },
          etudiant: {
            select: {
              id: true,
              matricule: true,
              promo: { select: { section: true } },
              user: { select: { nom: true, prenom: true } },
            },
          },
        },
      }),
      prisma.justification.findMany({
        include: {
          type: { select: { nom: true } },
          etudiant: {
            select: {
              id: true,
              matricule: true,
              promo: { select: { section: true } },
              user: { select: { nom: true, prenom: true } },
            },
          },
        },
      }),
    ]);

    const mappedReclamations = reclamations.map((item) => {
      const studentName = `${item.etudiant.user.prenom ?? ""} ${item.etudiant.user.nom ?? ""}`.trim() || "Student";
      return {
        id: `REC-${item.id}`,
        requestId: item.id,
        category: "reclamation",
        title: item.objet,
        description: item.description,
        type: item.type.nom || "Reclamation",
        status: mapReclamationStatusToUi(item.status, item.reponse),
        priority: ["haute", "urgente"].includes(String(item.priorite)) ? "high" : "normal",
        dateSubmitted: item.createdAt,
        studentName,
        studentId: item.etudiant.matricule || `ETU-${item.etudiant.id}`,
        department: item.etudiant.promo?.section || "N/A",
        attachments: [],
        internalNotes: item.reponse || "",
        linkedExam: null,
      };
    });

    const mappedJustifications = justifications.map((item) => {
      const studentName = `${item.etudiant.user.prenom ?? ""} ${item.etudiant.user.nom ?? ""}`.trim() || "Student";
      return {
        id: `JUS-${item.id}`,
        requestId: item.id,
        category: "justification",
        title: item.motif || "Absence Justification",
        description: item.motif || "No additional description provided",
        type: item.type.nom || "Justification",
        status: mapJustificationStatusToUi(item.status, item.commentaireAdmin),
        priority: "normal",
        dateSubmitted: item.createdAt,
        studentName,
        studentId: item.etudiant.matricule || `ETU-${item.etudiant.id}`,
        department: item.etudiant.promo?.section || "N/A",
        attachments: item.document ? [{ name: "Attachment", type: "Document", size: "N/A" }] : [],
        internalNotes: item.commentaireAdmin || "",
        linkedExam: null,
      };
    });

    const data = [...mappedReclamations, ...mappedJustifications].sort(
      (a, b) => new Date(b.dateSubmitted).getTime() - new Date(a.dateSubmitted).getTime()
    );

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("getAdminRequestsInbox error:", error);
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
};

// POST /api/v1/requests/admin/reclamations/:id/decision
export const decideReclamation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!isAdminRole(req.user?.roles)) {
      res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Only admin can decide requests" },
      });
      return;
    }

    const reclamationId = Number(req.params.id);
    if (!Number.isInteger(reclamationId) || reclamationId <= 0) {
      res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message: "Invalid reclamation id" } });
      return;
    }

    const action = String(req.body?.action || "").toLowerCase();
    const responseText = String(req.body?.responseText || "").trim();
    if (!["approve", "reject", "info"].includes(action)) {
      res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message: "Invalid action" } });
      return;
    }

    const status: StatusReclamation =
      action === "approve"
        ? StatusReclamation.traitee
        : action === "reject"
          ? StatusReclamation.refusee
          : StatusReclamation.en_cours;

    const responseValue = action === "info" ? `[INFO_REQUEST] ${responseText}`.trim() : responseText || null;

    const updated = await prisma.reclamation.update({
      where: { id: reclamationId },
      data: {
        status,
        traitePar: req.user?.id,
        dateTraitement: new Date(),
        reponse: responseValue,
      },
      include: {
        etudiant: { select: { id: true } },
      },
    });

    if (action === "approve" || action === "reject") {
      await notifyRequestDecision(
        updated.etudiant.id,
        "reclamation",
        updated.id,
        action === "approve",
        responseText
      );
    }

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error("decideReclamation error:", error);
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
};

// ════════════════════════════════════════════════════════════
//  JUSTIFICATIONS
// ════════════════════════════════════════════════════════════

// POST /api/v1/requests/justifications
export const createJustification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const etudiantId = await getEtudiantId(userId);

    if (!etudiantId) {
      res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Only students can submit justifications" },
      });
      return;
    }

    const { typeId, typeName, dateAbsence, motif } = req.body;
    const resolvedTypeId = await resolveJustificationTypeId(typeId, typeName);

    const justification = await prisma.justification.create({
      data: {
        etudiantId,
        typeId: resolvedTypeId,
        dateAbsence: new Date(dateAbsence),
        motif: motif ?? null,
        status: "soumis",
      },
      include: {
        type: { select: { nom: true } },
        etudiant: {
          include: {
            user: { select: { nom: true, prenom: true, email: true } },
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "Justification submitted successfully",
      data: justification,
    });
  } catch (error) {
    console.error("createJustification error:", error);
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
};

// GET /api/v1/requests/justifications
export const getMyJustifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const etudiantId = await getEtudiantId(userId);

    if (!etudiantId) {
      res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Only students can view justifications" },
      });
      return;
    }

    const { status } = req.query;
    const where: any = { etudiantId };
    if (status) where.status = status;

    const justifications = await prisma.justification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        type: { select: { nom: true } },
      },
    });

    const all = await prisma.justification.findMany({
      where: { etudiantId },
      select: { status: true },
    });

    const stats = {
      total: all.length,
      pending: all.filter((j) => j.status === "soumis" || j.status === "en_verification").length,
      resolved: all.filter((j) => j.status === "valide").length,
      rejected: all.filter((j) => j.status === "refuse").length,
    };

    res.status(200).json({
      success: true,
      data: justifications,
      stats,
    });
  } catch (error) {
    console.error("getMyJustifications error:", error);
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
};

// POST /api/v1/requests/admin/justifications/:id/decision
export const decideJustification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!isAdminRole(req.user?.roles)) {
      res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Only admin can decide requests" },
      });
      return;
    }

    const justificationId = Number(req.params.id);
    if (!Number.isInteger(justificationId) || justificationId <= 0) {
      res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message: "Invalid justification id" } });
      return;
    }

    const action = String(req.body?.action || "").toLowerCase();
    const responseText = String(req.body?.responseText || "").trim();
    if (!["approve", "reject", "info"].includes(action)) {
      res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message: "Invalid action" } });
      return;
    }

    const status: StatusJustification =
      action === "approve"
        ? StatusJustification.valide
        : action === "reject"
          ? StatusJustification.refuse
          : StatusJustification.en_verification;

    const adminComment = action === "info" ? `[INFO_REQUEST] ${responseText}`.trim() : responseText || null;

    const updated = await prisma.justification.update({
      where: { id: justificationId },
      data: {
        status,
        traitePar: req.user?.id,
        dateTraitement: new Date(),
        commentaireAdmin: adminComment,
      },
      include: {
        etudiant: { select: { id: true } },
      },
    });

    if (action === "approve" || action === "reject") {
      await notifyRequestDecision(
        updated.etudiant.id,
        "justification",
        updated.id,
        action === "approve",
        responseText
      );
    }

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error("decideJustification error:", error);
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  }
};

// GET /api/v1/requests/types/reclamations
export const getReclamationTypes = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    await ensureDefaultReclamationTypes();
    const types = await prisma.reclamationType.findMany({
      select: { id: true, nom: true, description: true },
      orderBy: { id: "asc" },
    });
    res.status(200).json({ success: true, data: types });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
  }
};

// GET /api/v1/requests/types/justifications
export const getJustificationTypes = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    await ensureDefaultJustificationTypes();
    const types = await prisma.typeAbsence.findMany({
      select: { id: true, nom: true, description: true },
      orderBy: { id: "asc" },
    });
    res.status(200).json({ success: true, data: types });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
  }
};
