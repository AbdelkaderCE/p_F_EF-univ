import { Request, Response } from "express";
import {
  closeAffectationCampaign,
  createAffectationCampaign,
  getAffectationCampaigns,
  updateAffectationCampaign,
} from "../../services/affectation/affectation.service";
import logger from "../../utils/logger";

const parseDate = (value: unknown): Date | undefined => {
  if (!value) return undefined;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const parsePositiveInt = (value: unknown): number | null => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
};

export const listAffectationCampaignsHandler = async (req: Request, res: Response) => {
  try {
    const campaigns = await getAffectationCampaigns({
      status: req.query.status ? String(req.query.status) : undefined,
      anneeUniversitaire: req.query.anneeUniversitaire
        ? String(req.query.anneeUniversitaire)
        : undefined,
    });

    res.status(200).json({ success: true, data: campaigns });
  } catch (error: any) {
    logger.error("Error listing affectation campaigns:", error);
    res.status(500).json({ success: false, message: error?.message || "Failed to list campaigns" });
  }
};

export const createAffectationCampaignHandler = async (req: Request, res: Response) => {
  try {
    const specialites = Array.isArray(req.body?.specialites)
      ? req.body.specialites
          .map((id: unknown) => Number(id))
          .filter((id: number) => Number.isInteger(id) && id > 0)
      : [];

    const dateDebut = parseDate(req.body?.dateDebut);
    const dateFin = parseDate(req.body?.dateFin);

    if (!req.body?.nom || !req.body?.anneeUniversitaire || !dateDebut || !dateFin) {
      res.status(400).json({
        success: false,
        message: "nom, anneeUniversitaire, dateDebut and dateFin are required",
      });
      return;
    }

    const created = await createAffectationCampaign({
      nom: String(req.body.nom).trim(),
      anneeUniversitaire: String(req.body.anneeUniversitaire).trim(),
      dateDebut,
      dateFin,
      specialites,
      niveauSource: req.body?.niveauSource,
      niveauCible: req.body?.niveauCible,
    });

    res.status(201).json({
      success: true,
      message: "Campaign created in draft mode. Open it when the choice period starts.",
      data: created,
    });
  } catch (error: any) {
    logger.error("Error creating affectation campaign:", error);
    res.status(500).json({ success: false, message: error?.message || "Failed to create campaign" });
  }
};

export const updateAffectationCampaignHandler = async (req: Request, res: Response) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: "Invalid campaign id" });
      return;
    }

    const updated = await updateAffectationCampaign(id, {
      nom: req.body?.nom,
      dateDebut: parseDate(req.body?.dateDebut),
      dateFin: parseDate(req.body?.dateFin),
      status: req.body?.status,
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    logger.error("Error updating affectation campaign:", error);
    res.status(500).json({ success: false, message: error?.message || "Failed to update campaign" });
  }
};

export const openAffectationCampaignHandler = async (req: Request, res: Response) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: "Invalid campaign id" });
      return;
    }

    const updated = await updateAffectationCampaign(id, { status: "ouverte" });
    res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    logger.error("Error opening affectation campaign:", error);
    res.status(500).json({ success: false, message: error?.message || "Failed to open campaign" });
  }
};

export const closeAffectationCampaignHandler = async (req: Request, res: Response) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: "Invalid campaign id" });
      return;
    }

    const closed = await closeAffectationCampaign(id);
    res.status(200).json({ success: true, data: closed });
  } catch (error: any) {
    logger.error("Error closing affectation campaign:", error);
    res.status(500).json({ success: false, message: error?.message || "Failed to close campaign" });
  }
};
