import { Response } from "express";
import { AuthRequest } from "../../middlewares/auth.middleware";
import {
  chooseSpecialite,
  getMySpecialiteChoices,
  getOpenCampagnes,
  getSpecialiteOptions,
  getStudentDeadlines,
  getStudentDocuments,
  getStudentNotes,
  getStudentProfile,
  getStudentSpecialties,
} from "../../modules/student/services/student.service";

const getUserIdOr401 = (req: AuthRequest, res: Response): number | null => {
  if (!req.user?.id) {
    res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required",
      },
    });
    return null;
  }

  return req.user.id;
};

const respondError = (res: Response, error: unknown, fallback: string) => {
  const message = error instanceof Error ? error.message : fallback;
  const statusCode = message.toLowerCase().includes("not found") ? 404 : 400;
  res.status(statusCode).json({
    success: false,
    error: {
      code: "STUDENT_API_ERROR",
      message,
    },
  });
};

export const getStudentProfileHandler = async (req: AuthRequest, res: Response) => {
  const userId = getUserIdOr401(req, res);
  if (!userId) {
    return;
  }

  try {
    const data = await getStudentProfile(userId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    respondError(res, error, "Failed to fetch student profile");
  }
};

export const getStudentSpecialtiesHandler = async (req: AuthRequest, res: Response) => {
  const userId = getUserIdOr401(req, res);
  if (!userId) {
    return;
  }

  try {
    const data = await getStudentSpecialties(userId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    respondError(res, error, "Failed to fetch student specialties");
  }
};

export const getStudentDeadlinesHandler = async (req: AuthRequest, res: Response) => {
  const userId = getUserIdOr401(req, res);
  if (!userId) {
    return;
  }

  try {
    const data = await getStudentDeadlines(userId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    respondError(res, error, "Failed to fetch student deadlines");
  }
};

export const getStudentDocumentsHandler = async (_req: AuthRequest, res: Response) => {
  try {
    const data = await getStudentDocuments();
    res.status(200).json({ success: true, data });
  } catch (error) {
    respondError(res, error, "Failed to fetch student documents");
  }
};

export const getStudentNotesHandler = async (req: AuthRequest, res: Response) => {
  const userId = getUserIdOr401(req, res);
  if (!userId) {
    return;
  }

  try {
    const data = await getStudentNotes(userId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    respondError(res, error, "Failed to fetch student notes");
  }
};

export const getSpecialiteOptionsHandler = async (req: AuthRequest, res: Response) => {
  const userId = getUserIdOr401(req, res);
  if (!userId) {
    return;
  }

  try {
    const campagnes = await getOpenCampagnes();
    const options = campagnes.length ? await getSpecialiteOptions(userId) : [];

    res.status(200).json({
      success: true,
      data: {
        options,
        campagnes,
      },
    });
  } catch (error) {
    respondError(res, error, "Failed to fetch specialite options");
  }
};

export const chooseSpecialiteHandler = async (req: AuthRequest, res: Response) => {
  const userId = getUserIdOr401(req, res);
  if (!userId) {
    return;
  }

  const campagneId = Number(req.body?.campagneId);
  const specialiteIdsRaw = Array.isArray(req.body?.specialiteIds) ? req.body.specialiteIds : [];
  const specialiteIds = specialiteIdsRaw.map((value: unknown) => Number(value)).filter((value: number) => Number.isInteger(value) && value > 0);

  if (!Number.isInteger(campagneId) || campagneId <= 0) {
    res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "campagneId must be a positive integer" },
    });
    return;
  }

  if (!specialiteIds.length) {
    res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "specialiteIds must contain at least one id" },
    });
    return;
  }

  try {
    const data = await chooseSpecialite(userId, { campagneId, specialiteIds });
    res.status(200).json({ success: true, data, message: "Specialite choices saved successfully" });
  } catch (error) {
    respondError(res, error, "Failed to choose specialite");
  }
};

export const getMySpecialiteChoicesHandler = async (req: AuthRequest, res: Response) => {
  const userId = getUserIdOr401(req, res);
  if (!userId) {
    return;
  }

  try {
    const data = await getMySpecialiteChoices(userId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    respondError(res, error, "Failed to fetch student choices");
  }
};
