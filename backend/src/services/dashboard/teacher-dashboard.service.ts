import { Prisma } from "@prisma/client";
import prisma from "../../config/database";

type TeacherProfileRow = {
  enseignantId: number;
  nom: string;
  prenom: string;
  email: string;
  photo: string | null;
  grade: string | null;
  bureau: string | null;
};

type EnseignementRow = {
  id: number;
  type: string | null;
  anneeUniversitaire: string | null;
  moduleNom: string | null;
  moduleCode: string | null;
  moduleSemestre: number | null;
  promoNom: string | null;
};

type PfeSujetRow = {
  id: number;
  titre: string;
  status: string;
  anneeUniversitaire: string;
  promoNom: string | null;
};

type CountRow = {
  count: bigint;
};

export type TeacherDashboardData = {
  profile: {
    id: number;
    nom: string;
    prenom: string;
    email: string;
    photo: string | null;
    grade: string;
    bureau: string | null;
  };
  enseignements: Array<{
    id: number;
    type: string | null;
    annee_universitaire: string | null;
    module: { nom: string | null; code: string | null; semestre: number | null };
    promo: { nom: string | null };
  }>;
  pfeSujets: Array<{
    id: number;
    titre: string;
    status: string;
    annee_universitaire: string;
    promo: { nom: string | null };
  }>;
  copiesRemise: Array<{ id: number }>;
  documentRequests: Array<{ id: number }>;
  juryGroups: number;
};

const toNumber = (value: bigint): number => Number(value);

export const getTeacherDashboardData = async (userId: number): Promise<TeacherDashboardData> => {
  const profileRows = await prisma.$queryRaw<TeacherProfileRow[]>(Prisma.sql`
    SELECT
      e.id AS "enseignantId",
      u.nom,
      u.prenom,
      u.email,
      u.photo,
      g.nom AS grade,
      e.bureau
    FROM enseignants e
    INNER JOIN users u ON u.id = e.user_id
    LEFT JOIN grades g ON g.id = e.grade_id
    WHERE e.user_id = ${userId}
    LIMIT 1
  `);

  if (!profileRows.length) {
    throw new Error("Teacher profile not found");
  }

  const profile = profileRows[0];

  const enseignements = await prisma.$queryRaw<EnseignementRow[]>(Prisma.sql`
    SELECT
      en.id,
      en.type::text AS type,
      en.annee_universitaire AS "anneeUniversitaire",
      m.nom AS "moduleNom",
      m.code AS "moduleCode",
      m.semestre AS "moduleSemestre",
      p.nom AS "promoNom"
    FROM enseignements en
    LEFT JOIN modules m ON m.id = en.module_id
    LEFT JOIN promos p ON p.id = en.promo_id
    WHERE en.enseignant_id = ${profile.enseignantId}
    ORDER BY en.annee_universitaire DESC NULLS LAST
    LIMIT 30
  `);

  const pfeSujets = await prisma.$queryRaw<PfeSujetRow[]>(Prisma.sql`
    SELECT
      s.id,
      s.titre,
      s.status::text AS status,
      s.annee_universitaire AS "anneeUniversitaire",
      p.nom AS "promoNom"
    FROM pfe_sujets s
    LEFT JOIN promos p ON p.id = s.promo_id
    WHERE s.enseignant_id = ${profile.enseignantId}
    ORDER BY s.created_at DESC
    LIMIT 20
  `);

  const copiesCountRows = await prisma.$queryRaw<CountRow[]>(Prisma.sql`
    SELECT COUNT(*)::bigint AS count
    FROM copies_remise cr
    INNER JOIN enseignements en ON en.id = cr.enseignement_id
    WHERE en.enseignant_id = ${profile.enseignantId}
  `);

  const documentCountRows = await prisma.$queryRaw<CountRow[]>(Prisma.sql`
    SELECT COUNT(*)::bigint AS count
    FROM document_requests dr
    WHERE dr.enseignant_id = ${profile.enseignantId}
  `);

  const juryCountRows = await prisma.$queryRaw<CountRow[]>(Prisma.sql`
    SELECT COUNT(*)::bigint AS count
    FROM pfe_jury pj
    WHERE pj.enseignant_id = ${profile.enseignantId}
  `);

  const copiesCount = copiesCountRows.length ? toNumber(copiesCountRows[0].count) : 0;
  const documentCount = documentCountRows.length ? toNumber(documentCountRows[0].count) : 0;
  const juryCount = juryCountRows.length ? toNumber(juryCountRows[0].count) : 0;

  return {
    profile: {
      id: profile.enseignantId,
      nom: profile.nom,
      prenom: profile.prenom,
      email: profile.email,
      photo: profile.photo,
      grade: profile.grade || "N/A",
      bureau: profile.bureau,
    },
    enseignements: enseignements.map((en) => ({
      id: en.id,
      type: en.type,
      annee_universitaire: en.anneeUniversitaire,
      module: {
        nom: en.moduleNom,
        code: en.moduleCode,
        semestre: en.moduleSemestre,
      },
      promo: { nom: en.promoNom },
    })),
    pfeSujets: pfeSujets.map((s) => ({
      id: s.id,
      titre: s.titre,
      status: s.status,
      annee_universitaire: s.anneeUniversitaire,
      promo: { nom: s.promoNom },
    })),
    copiesRemise: Array.from({ length: copiesCount }, (_value, index) => ({ id: index + 1 })),
    documentRequests: Array.from({ length: documentCount }, (_value, index) => ({ id: index + 1 })),
    juryGroups: juryCount,
  };
};
