import prisma from "../../config/database";
import type { Niveau, Prisma } from "@prisma/client";
import {
  hashPassword,
  comparePasswords,
  isStrongPassword,
  generateRandomPassword,
} from "../../utils/password";
import {
  signAccessToken,
  signRefreshToken,
  hashToken,
  generateRawToken,
} from "../../utils/tokens";
import jwt from "jsonwebtoken";
import { JWT_REFRESH_SECRET } from "../../config/auth";

// ── Interfaces ──────────────────────────────────────────────────

export interface RegisterInput {
  email: string;
  password: string;
  nom: string;
  prenom: string;
}

export interface UserPayload {
  sub: number;
  email: string;
  roles: string[];
}

export interface LoginResponse {
  user: {
    id: number;
    email: string;
    nom: string;
    prenom: string;
    roles: string[];
    firstUse?: boolean;
  };
  accessToken: string;
  refreshToken: string;
  requiresPasswordChange: boolean;
}

export class AuthServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthServiceError";
  }
}

type RoleNameRecord = { nom: string | null };
type UserRoleWithRoleName = { role: RoleNameRecord };
type RoleRecord = { id: number; nom: string | null; description: string | null };

type AdminListUserRecord = {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  sexe: "H" | "F" | null;
  telephone: string | null;
  status: "active" | "inactive" | "suspended";
  createdAt: Date;
  lastLogin: Date | null;
  userRoles: UserRoleWithRoleName[];
};

// ── Helpers ─────────────────────────────────────────────────────

/** Fetch the role names for a given userId from user_roles + roles tables */
const getUserRoles = async (userId: number): Promise<string[]> => {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: true },
  });
  return userRoles.map((ur: UserRoleWithRoleName) => ur.role.nom ?? "unknown");
};

/** Build the JWT payload for a user */
const buildPayload = (user: { id: number; email: string }, roles: string[]): UserPayload => ({
  sub: user.id,
  email: user.email,
  roles,
});

const ROLE_ALIAS_MAP: Record<string, string> = {
  admin: "admin",
  teacher: "enseignant",
  enseignant: "enseignant",
  student: "etudiant",
  etudiant: "etudiant",
  delegate: "delegue",
  delegue: "delegue",
  chefspecialite: "chef_specialite",
  chef_specialite: "chef_specialite",
  chefdepartement: "chef_departement",
  chef_departement: "chef_departement",
  presidentconseil: "president_conseil",
  president_conseil: "president_conseil",
  adminfaculte: "admin_faculte",
  admin_faculte: "admin_faculte",
  vicedoyen: "vice_doyen",
  vice_doyen: "vice_doyen",
  directeuretude: "directeur_etude",
  directeur_etude: "directeur_etude",
  presidentjury: "president_jury",
  president_jury: "president_jury",
};

const BASE_CREATION_ROLES = new Set(["admin", "enseignant", "etudiant"]);
const STUDENT_TRACK_ROLES = new Set(["etudiant", "delegue"]);
const STAFF_TRACK_ROLES = new Set([
  "admin",
  "enseignant",
  "chef_specialite",
  "chef_departement",
  "president_conseil",
  "admin_faculte",
  "vice_doyen",
  "directeur_etude",
  "president_jury",
]);

const ALL_ASSIGNABLE_ROLES = new Set([
  ...Array.from(BASE_CREATION_ROLES),
  ...Array.from(STUDENT_TRACK_ROLES),
  ...Array.from(STAFF_TRACK_ROLES),
]);

const normalizeRoleNames = (roleNames: string[]) => {
  const normalized: string[] = [];
  const invalid: string[] = [];

  for (const rawRole of roleNames) {
    const key = rawRole?.trim().toLowerCase();
    if (!key) continue;

    const mapped = ROLE_ALIAS_MAP[key];
    if (!mapped) {
      invalid.push(rawRole);
      continue;
    }

    if (!normalized.includes(mapped)) {
      normalized.push(mapped);
    }
  }

  return { normalized, invalid };
};

const getRoleTrack = (roleName: string): "student" | "staff" | "unknown" => {
  if (STUDENT_TRACK_ROLES.has(roleName)) return "student";
  if (STAFF_TRACK_ROLES.has(roleName)) return "staff";
  return "unknown";
};

const validateCreateRoles = (roleNames: string[]): { valid: boolean; error?: string; normalized?: string[] } => {
  const { normalized, invalid } = normalizeRoleNames(roleNames);

  if (invalid.length > 0) {
    return {
      valid: false,
      error: `Invalid role(s): ${invalid.join(", ")}`,
    };
  }

  if (normalized.length === 0) {
    return {
      valid: false,
      error: "At least one role must be assigned to the user.",
    };
  }

  if (normalized.length !== 1 || !BASE_CREATION_ROLES.has(normalized[0])) {
    return {
      valid: false,
      error: "When creating a user, choose exactly one base role: admin, teacher, or student.",
    };
  }

  return { valid: true, normalized };
};

const validateAssignableRoles = (
  roleNames: string[],
  currentRoleNames?: string[]
): { valid: boolean; error?: string; normalized?: string[] } => {
  const { normalized, invalid } = normalizeRoleNames(roleNames);
  if (invalid.length > 0) {
    return {
      valid: false,
      error: `Invalid role(s): ${invalid.join(", ")}`,
    };
  }

  if (normalized.length === 0) {
    return {
      valid: false,
      error: "At least one role must be assigned to the user.",
    };
  }

  const nonAssignable = normalized.filter((roleName) => !ALL_ASSIGNABLE_ROLES.has(roleName));
  if (nonAssignable.length > 0) {
    return {
      valid: false,
      error: `These roles are not assignable in this workflow: ${nonAssignable.join(", ")}`,
    };
  }

  const targetTracks = new Set(normalized.map(getRoleTrack));
  if (targetTracks.has("student") && targetTracks.has("staff")) {
    return {
      valid: false,
      error: "Cannot mix student roles with teacher/staff roles.",
    };
  }

  if (targetTracks.has("unknown")) {
    return {
      valid: false,
      error: "Unknown role type detected.",
    };
  }

  if (currentRoleNames?.length) {
    const currentNormalized = normalizeRoleNames(currentRoleNames).normalized;
    const currentTracks = new Set(currentNormalized.map(getRoleTrack));
    const currentMainTrack = currentTracks.has("student")
      ? "student"
      : (currentTracks.has("staff") ? "staff" : null);
    const targetMainTrack = targetTracks.has("student") ? "student" : "staff";

    if (currentMainTrack && currentMainTrack !== targetMainTrack) {
      return {
        valid: false,
        error: "Role track cannot be changed. A student stays in student track; a teacher/admin stays in staff track.",
      };
    }
  }

  return { valid: true, normalized };
};

// ── Register ────────────────────────────────────────────────────

export const registerUser = async (data: RegisterInput): Promise<LoginResponse> => {
  if (!isStrongPassword(data.password)) {
    throw new AuthServiceError(
      "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new AuthServiceError("Email already exists");
  }

  const hashedPassword = await hashPassword(data.password);

  // Create user + assign default role "etudiant" in a transaction
  const user = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const newUser = await tx.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        nom: data.nom,
        prenom: data.prenom,
        firstUse: false,
      },
    });

    // Find or create the default "etudiant" role
    let role = await tx.role.findFirst({ where: { nom: "etudiant" } });
    if (!role) {
      role = await tx.role.create({ data: { nom: "etudiant", description: "Étudiant" } });
    }

    await tx.userRole.create({
      data: { userId: newUser.id, roleId: role.id },
    });

    return newUser;
  });

  const roles = await getUserRoles(user.id);

  // Email verification token (stored on the user row itself)
  const rawToken = generateRawToken();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetToken: hashToken(rawToken),
      resetTokenExpire: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 h
    },
  });

  console.log(`📧 Verification link: ${process.env.APP_BASE_URL}/api/v1/auth/verify-email/${rawToken}`);

  // Generate JWT tokens
  const payload = buildPayload(user, roles);
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  return {
    user: {
      id: user.id,
      email: user.email,
      nom: user.nom,
      prenom: user.prenom,
      roles,
    },
    accessToken,
    refreshToken,
    requiresPasswordChange: false,
  };
};

// ── Login ───────────────────────────────────────────────────────

export const loginUser = async (email: string, password: string): Promise<LoginResponse> => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new AuthServiceError("Invalid email or password");
  }

  // Check account status
  if (user.status !== "active") {
    throw new AuthServiceError("Account is suspended or inactive");
  }

  // Verify password
  const isValidPassword = await comparePasswords(password, user.password);

  if (!isValidPassword) {
    // Increment login attempts (schema field: loginAttempts / login_attempts)
    const attempts = user.loginAttempts + 1;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: attempts,
        // Suspend after 5 failed attempts
        status: attempts >= 5 ? "suspended" : user.status,
      },
    });
    throw new AuthServiceError("Invalid email or password");
  }

  // Reset attempts on success
  await prisma.user.update({
    where: { id: user.id },
    data: {
      loginAttempts: 0,
      lastLogin: new Date(),
    },
  });

  const roles = await getUserRoles(user.id);

  const payload = buildPayload(user, roles);
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  return {
    user: {
      id: user.id,
      email: user.email,
      nom: user.nom,
      prenom: user.prenom,
      roles,
      firstUse: user.firstUse,
    },
    accessToken,
    refreshToken,
    requiresPasswordChange: user.firstUse,
  };
};

// ── Change password ─────────────────────────────────────────────

export const changePassword = async (
  userId: number,
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AuthServiceError("User not found");
  }

  const isValid = await comparePasswords(currentPassword, user.password);
  if (!isValid) {
    throw new AuthServiceError("Current password is incorrect");
  }

  if (!isStrongPassword(newPassword)) {
    throw new AuthServiceError(
      "Password must be at least 8 characters and contain uppercase, lowercase, number, and special character"
    );
  }

  const hashedPassword = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      firstUse: false,
    },
  });
};

// ── Create user by admin ────────────────────────────────────────

export const createUserByAdmin = async (data: {
  email: string;
  nom: string;
  prenom: string;
  roleName?: string;
  roleNames?: string[];
  sexe?: "H" | "F";
  telephone?: string;
  promoId?: number;
  specialiteId?: number;
  moduleIds?: number[];
  anneeUniversitaire?: string;
}): Promise<{
  user: { id: number; email: string; nom: string; prenom: string; roles: string[] };
  tempPassword: string;
}> => {
  const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
  if (existingUser) {
    throw new AuthServiceError("User with this email already exists");
  }

  const tempPassword = generateRandomPassword(12);
  const hashedPassword = await hashPassword(tempPassword);

  const requestedRoleNames = Array.from(
    new Set(
      (data.roleNames?.length ? data.roleNames : (data.roleName ? [data.roleName] : []))
        .map((role) => role?.trim())
        .filter((role): role is string => !!role)
    )
  );

  const roleValidation = validateCreateRoles(requestedRoleNames);
  if (!roleValidation.valid) {
    throw new AuthServiceError(roleValidation.error || "Invalid role combination");
  }
  const normalizedCreateRoles = roleValidation.normalized || [];

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const newUser = await tx.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        nom: data.nom,
        prenom: data.prenom,
        sexe: data.sexe as any,
        telephone: data.telephone,
        firstUse: true, // force password change on first login
      },
    });

    const roles = await tx.role.findMany({ where: { nom: { in: normalizedCreateRoles } } });
    if (roles.length !== normalizedCreateRoles.length) {
      const found = new Set(roles.map((role: RoleNameRecord) => role.nom).filter((name: string | null): name is string => !!name));
      const missing = normalizedCreateRoles.filter((name) => !found.has(name));
      throw new AuthServiceError(`Role(s) not found: ${missing.join(", ")}`);
    }

    await tx.userRole.createMany({
      data: roles.map((role: { id: number }) => ({ userId: newUser.id, roleId: role.id })),
      skipDuplicates: true,
    });

    const baseRole = normalizedCreateRoles[0];

    if (baseRole === "etudiant") {
      let resolvedPromoId: number | null = null;
      if (Number.isInteger(data.promoId) && (data.promoId as number) > 0) {
        const promo = await tx.promo.findUnique({ where: { id: data.promoId as number }, select: { id: true } });
        if (!promo) {
          throw new AuthServiceError("Selected promo was not found");
        }
        resolvedPromoId = promo.id;
      }

      await tx.etudiant.create({
        data: {
          userId: newUser.id,
          promoId: resolvedPromoId,
          anneeInscription: new Date().getFullYear(),
        },
      });
    }

    if (baseRole === "enseignant") {
      const enseignant = await tx.enseignant.create({
        data: {
          userId: newUser.id,
        },
      });

      const normalizedModuleIds = Array.from(
        new Set(
          (Array.isArray(data.moduleIds) ? data.moduleIds : [])
            .map((id) => Number(id))
            .filter((id) => Number.isInteger(id) && id > 0)
        )
      );

      if (normalizedModuleIds.length > 0) {
        const modules = await tx.module.findMany({
          where: { id: { in: normalizedModuleIds } },
          select: { id: true, specialiteId: true },
        });

        if (modules.length !== normalizedModuleIds.length) {
          throw new AuthServiceError("One or more selected modules were not found");
        }

        if (Number.isInteger(data.specialiteId) && (data.specialiteId as number) > 0) {
          const invalidSpecialiteModules = modules.filter((module) => module.specialiteId !== data.specialiteId);
          if (invalidSpecialiteModules.length > 0) {
            throw new AuthServiceError("Selected modules must belong to the selected specialite");
          }
        }

        await tx.enseignement.createMany({
          data: modules.map((module) => ({
            enseignantId: enseignant.id,
            moduleId: module.id,
            anneeUniversitaire: data.anneeUniversitaire?.trim() || undefined,
          })),
          skipDuplicates: true,
        });
      }
    }

    return newUser;
  });

  const roles = await getUserRoles(result.id);

  return {
    user: {
      id: result.id,
      email: result.email,
      nom: result.nom,
      prenom: result.prenom,
      roles,
    },
    tempPassword,
  };
};

export const getAcademicManagementOptions = async (): Promise<{
  specialites: Array<{ id: number; nom: string; niveau: string | null }>;
  promos: Array<{ id: number; nom: string | null; section: string | null; anneeUniversitaire: string | null; specialiteId: number | null; specialiteNom: string | null }>;
  modules: Array<{ id: number; nom: string; code: string; semestre: number | null; specialiteId: number; specialiteNom: string | null }>;
}> => {
  const [specialites, promos, modules] = await Promise.all([
    prisma.specialite.findMany({
      select: {
        id: true,
        nom: true,
        niveau: true,
      },
      orderBy: { nom: "asc" },
    }),
    prisma.promo.findMany({
      select: {
        id: true,
        nom: true,
        section: true,
        anneeUniversitaire: true,
        specialiteId: true,
        specialite: {
          select: { nom: true },
        },
      },
      orderBy: [{ anneeUniversitaire: "desc" }, { nom: "asc" }],
    }),
    prisma.module.findMany({
      select: {
        id: true,
        nom: true,
        code: true,
        semestre: true,
        specialiteId: true,
        specialite: {
          select: { nom: true },
        },
      },
      orderBy: [{ specialiteId: "asc" }, { semestre: "asc" }, { nom: "asc" }],
    }),
  ]);

  return {
    specialites: specialites.map((item) => ({
      id: item.id,
      nom: item.nom,
      niveau: item.niveau ?? null,
    })),
    promos: promos.map((item) => ({
      id: item.id,
      nom: item.nom,
      section: item.section,
      anneeUniversitaire: item.anneeUniversitaire,
      specialiteId: item.specialiteId,
      specialiteNom: item.specialite?.nom ?? null,
    })),
    modules: modules.map((item) => ({
      id: item.id,
      nom: item.nom,
      code: item.code,
      semestre: item.semestre,
      specialiteId: item.specialiteId,
      specialiteNom: item.specialite?.nom ?? null,
    })),
  };
};

export const createSpecialiteForManagement = async (input: {
  nom: string;
  niveau?: string;
  filiereId?: number;
}) => {
  const nom = String(input.nom || "").trim();
  if (!nom) {
    throw new AuthServiceError("Specialite name is required");
  }

  const normalizedNiveau = String(input.niveau || "").trim().toUpperCase();
  const allowedNiveaux: Niveau[] = ["L1", "L2", "L3", "M1", "M2"];
  const niveau = normalizedNiveau && allowedNiveaux.includes(normalizedNiveau as Niveau)
    ? (normalizedNiveau as Niveau)
    : undefined;

  if (input.niveau && !niveau) {
    throw new AuthServiceError("Invalid niveau. Use one of: L1, L2, L3, M1, M2");
  }

  const created = await prisma.specialite.create({
    data: {
      nom,
      niveau,
      filiereId: Number.isInteger(input.filiereId) && (input.filiereId as number) > 0
        ? input.filiereId
        : undefined,
    },
    select: {
      id: true,
      nom: true,
      niveau: true,
      filiereId: true,
    },
  });

  return created;
};

export const createPromoForManagement = async (input: {
  nom?: string;
  section?: string;
  anneeUniversitaire?: string;
  specialiteId?: number;
}) => {
  const specialiteId = Number(input.specialiteId);
  if (!Number.isInteger(specialiteId) || specialiteId <= 0) {
    throw new AuthServiceError("specialiteId is required");
  }

  const specialite = await prisma.specialite.findUnique({ where: { id: specialiteId }, select: { id: true } });
  if (!specialite) {
    throw new AuthServiceError("Selected specialite was not found");
  }

  const created = await prisma.promo.create({
    data: {
      nom: String(input.nom || "").trim() || undefined,
      section: String(input.section || "").trim() || undefined,
      anneeUniversitaire: String(input.anneeUniversitaire || "").trim() || undefined,
      specialiteId,
    },
    select: {
      id: true,
      nom: true,
      section: true,
      anneeUniversitaire: true,
      specialiteId: true,
    },
  });

  return created;
};

export const createModuleForManagement = async (input: {
  nom: string;
  code: string;
  specialiteId: number;
  semestre?: number;
  credit?: number;
  coef?: number;
  volumeCours?: number;
  volumeTd?: number;
  volumeTp?: number;
}) => {
  const nom = String(input.nom || "").trim();
  const code = String(input.code || "").trim();
  const specialiteId = Number(input.specialiteId);

  if (!nom || !code || !Number.isInteger(specialiteId) || specialiteId <= 0) {
    throw new AuthServiceError("nom, code, and specialiteId are required");
  }

  const specialite = await prisma.specialite.findUnique({ where: { id: specialiteId }, select: { id: true } });
  if (!specialite) {
    throw new AuthServiceError("Selected specialite was not found");
  }

  const existingCode = await prisma.module.findUnique({ where: { code }, select: { id: true } });
  if (existingCode) {
    throw new AuthServiceError("Module code already exists");
  }

  const created = await prisma.module.create({
    data: {
      nom,
      code,
      specialiteId,
      semestre: Number.isInteger(input.semestre) ? input.semestre : undefined,
      credit: Number.isInteger(input.credit) ? input.credit : undefined,
      coef: typeof input.coef === "number" ? input.coef : undefined,
      volumeCours: Number.isInteger(input.volumeCours) ? input.volumeCours : undefined,
      volumeTd: Number.isInteger(input.volumeTd) ? input.volumeTd : undefined,
      volumeTp: Number.isInteger(input.volumeTp) ? input.volumeTp : undefined,
    },
    select: {
      id: true,
      nom: true,
      code: true,
      specialiteId: true,
      semestre: true,
    },
  });

  return created;
};

export const getAcademicAssignmentsData = async (): Promise<{
  promos: Array<{ id: number; nom: string | null; section: string | null; anneeUniversitaire: string | null; specialiteNom: string | null }>;
  modules: Array<{ id: number; nom: string; code: string; semestre: number | null; specialiteId: number; specialiteNom: string | null }>;
  students: Array<{ id: number; userId: number; nom: string; prenom: string; email: string; promoId: number | null; promoLabel: string | null }>;
  teachers: Array<{ id: number; userId: number; nom: string; prenom: string; email: string; moduleIds: number[]; promoIds: number[]; anneeUniversitaire: string | null }>;
}> => {
  const [promos, modules, students, teachers] = await Promise.all([
    prisma.promo.findMany({
      select: {
        id: true,
        nom: true,
        section: true,
        anneeUniversitaire: true,
        specialite: { select: { nom: true } },
      },
      orderBy: [{ anneeUniversitaire: "desc" }, { nom: "asc" }],
    }),
    prisma.module.findMany({
      select: {
        id: true,
        nom: true,
        code: true,
        semestre: true,
        specialiteId: true,
        specialite: { select: { nom: true } },
      },
      orderBy: [{ specialiteId: "asc" }, { semestre: "asc" }, { nom: "asc" }],
    }),
    prisma.etudiant.findMany({
      select: {
        id: true,
        userId: true,
        promoId: true,
        user: { select: { nom: true, prenom: true, email: true } },
        promo: { select: { nom: true, section: true, anneeUniversitaire: true } },
      },
      orderBy: { id: "asc" },
    }),
    prisma.enseignant.findMany({
      select: {
        id: true,
        userId: true,
        user: { select: { nom: true, prenom: true, email: true } },
        enseignements: {
          select: {
            moduleId: true,
            promoId: true,
            anneeUniversitaire: true,
          },
        },
      },
      orderBy: { id: "asc" },
    }),
  ]);

  return {
    promos: promos.map((promo) => ({
      id: promo.id,
      nom: promo.nom,
      section: promo.section,
      anneeUniversitaire: promo.anneeUniversitaire,
      specialiteNom: promo.specialite?.nom ?? null,
    })),
    modules: modules.map((module) => ({
      id: module.id,
      nom: module.nom,
      code: module.code,
      semestre: module.semestre,
      specialiteId: module.specialiteId,
      specialiteNom: module.specialite?.nom ?? null,
    })),
    students: students.map((student) => ({
      id: student.id,
      userId: student.userId,
      nom: student.user.nom,
      prenom: student.user.prenom,
      email: student.user.email,
      promoId: student.promoId,
      promoLabel: student.promo
        ? `${student.promo.nom || `Promo ${student.promoId}`} | ${student.promo.section || "-"} | ${student.promo.anneeUniversitaire || "-"}`
        : null,
    })),
    teachers: teachers.map((teacher) => ({
      id: teacher.id,
      userId: teacher.userId,
      nom: teacher.user.nom,
      prenom: teacher.user.prenom,
      email: teacher.user.email,
      moduleIds: Array.from(new Set(teacher.enseignements.map((item) => item.moduleId).filter((value): value is number => Number.isInteger(value)))),
      promoIds: Array.from(new Set(teacher.enseignements.map((item) => item.promoId).filter((value): value is number => Number.isInteger(value)))),
      anneeUniversitaire: teacher.enseignements.find((item) => !!item.anneeUniversitaire)?.anneeUniversitaire || null,
    })),
  };
};

export const assignStudentPromoByAdmin = async (
  requesterUserId: number,
  targetUserId: number,
  promoId: number
) => {
  if (!requesterUserId) {
    throw new AuthServiceError("Unauthorized request");
  }

  if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
    throw new AuthServiceError("Invalid target user id");
  }

  if (!Number.isInteger(promoId) || promoId <= 0) {
    throw new AuthServiceError("Valid promoId is required");
  }

  const [targetUser, promo] = await Promise.all([
    prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true, email: true, nom: true, prenom: true } }),
    prisma.promo.findUnique({ where: { id: promoId }, select: { id: true } }),
  ]);

  if (!targetUser) {
    throw new AuthServiceError("Target user not found");
  }
  if (!promo) {
    throw new AuthServiceError("Selected promo not found");
  }

  const updated = await prisma.etudiant.upsert({
    where: { userId: targetUserId },
    update: { promoId },
    create: {
      userId: targetUserId,
      promoId,
      anneeInscription: new Date().getFullYear(),
    },
    select: {
      id: true,
      promoId: true,
    },
  });

  return {
    userId: targetUserId,
    etudiantId: updated.id,
    promoId: updated.promoId,
  };
};

export const assignTeacherModulesByAdmin = async (
  requesterUserId: number,
  targetUserId: number,
  input: {
    moduleIds: number[];
    promoId?: number;
    anneeUniversitaire?: string;
  }
) => {
  if (!requesterUserId) {
    throw new AuthServiceError("Unauthorized request");
  }

  if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
    throw new AuthServiceError("Invalid target user id");
  }

  const normalizedModuleIds = Array.from(
    new Set(
      (Array.isArray(input.moduleIds) ? input.moduleIds : [])
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0)
    )
  );

  if (normalizedModuleIds.length === 0) {
    throw new AuthServiceError("Select at least one module");
  }

  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } });
  if (!targetUser) {
    throw new AuthServiceError("Target user not found");
  }

  const modules = await prisma.module.findMany({ where: { id: { in: normalizedModuleIds } }, select: { id: true } });
  if (modules.length !== normalizedModuleIds.length) {
    throw new AuthServiceError("One or more selected modules were not found");
  }

  let promoId: number | undefined;
  if (Number.isInteger(input.promoId) && (input.promoId as number) > 0) {
    const promo = await prisma.promo.findUnique({ where: { id: input.promoId as number }, select: { id: true } });
    if (!promo) {
      throw new AuthServiceError("Selected promo not found");
    }
    promoId = promo.id;
  }

  const result = await prisma.$transaction(async (tx) => {
    const enseignant = await tx.enseignant.upsert({
      where: { userId: targetUserId },
      update: {},
      create: { userId: targetUserId },
      select: { id: true },
    });

    await tx.enseignement.deleteMany({ where: { enseignantId: enseignant.id } });

    await tx.enseignement.createMany({
      data: normalizedModuleIds.map((moduleId) => ({
        enseignantId: enseignant.id,
        moduleId,
        promoId,
        anneeUniversitaire: input.anneeUniversitaire?.trim() || undefined,
      })),
    });

    return enseignant;
  });

  return {
    userId: targetUserId,
    enseignantId: result.id,
    moduleIds: normalizedModuleIds,
    promoId: promoId ?? null,
    anneeUniversitaire: input.anneeUniversitaire?.trim() || null,
  };
};

export const listRolesForAdmin = async (): Promise<Array<{ id: number; nom: string; description: string | null }>> => {
  const roles = await prisma.role.findMany({
    where: {
      nom: {
        in: Array.from(ALL_ASSIGNABLE_ROLES),
      },
    },
    select: {
      id: true,
      nom: true,
      description: true,
    },
    orderBy: { nom: "asc" },
  });

  return roles.map((role: RoleRecord) => ({
    id: role.id,
    nom: role.nom ?? "unknown",
    description: role.description,
  }));
};

export const listUsersForAdmin = async (): Promise<Array<{
  id: number;
  email: string;
  nom: string;
  prenom: string;
  sexe: "H" | "F" | null;
  telephone: string | null;
  status: "active" | "inactive" | "suspended";
  createdAt: Date;
  lastLogin: Date | null;
  roles: string[];
}>> => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      nom: true,
      prenom: true,
      sexe: true,
      telephone: true,
      status: true,
      createdAt: true,
      lastLogin: true,
      userRoles: {
        include: {
          role: {
            select: {
              nom: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return users.map((user: AdminListUserRecord) => ({
    ...user,
    roles: user.userRoles
      .map((userRole: UserRoleWithRoleName) => userRole.role.nom)
      .filter((name: string | null): name is string => !!name),
  }));
};

export const updateUserRolesByAdmin = async (
  requesterUserId: number,
  targetUserId: number,
  roleNames: string[]
): Promise<{
  id: number;
  email: string;
  nom: string;
  prenom: string;
  roles: string[];
}> => {
  if (!requesterUserId) {
    throw new AuthServiceError("Unauthorized request");
  }

  const normalizedRoleNames = Array.from(
    new Set(
      roleNames
        .map((role) => role?.trim())
        .filter((role): role is string => !!role)
    )
  );

  const currentRoles = await getUserRoles(targetUserId);
  const roleValidation = validateAssignableRoles(normalizedRoleNames, currentRoles);
  if (!roleValidation.valid) {
    throw new AuthServiceError(roleValidation.error || "Invalid role combination");
  }

  const normalizedAssignableRoles = roleValidation.normalized || [];

  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!targetUser) {
    throw new AuthServiceError("User not found");
  }

  const roles = await prisma.role.findMany({ where: { nom: { in: normalizedAssignableRoles } } });
  if (roles.length !== normalizedAssignableRoles.length) {
    const found = new Set(roles.map((role: RoleNameRecord) => role.nom).filter((name: string | null): name is string => !!name));
    const missing = normalizedAssignableRoles.filter((name) => !found.has(name));
    throw new AuthServiceError(`Role(s) not found: ${missing.join(", ")}`);
  }

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.userRole.deleteMany({ where: { userId: targetUserId } });
    await tx.userRole.createMany({
      data: roles.map((role: { id: number }) => ({ userId: targetUserId, roleId: role.id })),
      skipDuplicates: true,
    });
  });

  const updatedRoles = await getUserRoles(targetUserId);

  return {
    id: targetUser.id,
    email: targetUser.email,
    nom: targetUser.nom,
    prenom: targetUser.prenom,
    roles: updatedRoles,
  };
};

export const updateUserStatusByAdmin = async (
  requesterUserId: number,
  targetUserId: number,
  status: "active" | "inactive" | "suspended"
): Promise<{
  id: number;
  email: string;
  nom: string;
  prenom: string;
  status: "active" | "inactive" | "suspended";
  roles: string[];
}> => {
  if (!requesterUserId) {
    throw new AuthServiceError("Unauthorized request");
  }

  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!targetUser) {
    throw new AuthServiceError("User not found");
  }

  const nextStatus = ["active", "inactive", "suspended"].includes(status)
    ? status
    : null;
  if (!nextStatus) {
    throw new AuthServiceError("Invalid status value");
  }

  const updatedUser = await prisma.user.update({
    where: { id: targetUserId },
    data: { status: nextStatus },
  });

  const updatedRoles = await getUserRoles(targetUserId);

  return {
    id: updatedUser.id,
    email: updatedUser.email,
    nom: updatedUser.nom,
    prenom: updatedUser.prenom,
    status: updatedUser.status,
    roles: updatedRoles,
  };
};

// ── Admin reset password ────────────────────────────────────────

export const adminResetPassword = async (
  requesterUserId: number,
  targetUserId: number
): Promise<string> => {
  if (!requesterUserId) {
    throw new AuthServiceError("Unauthorized request");
  }

  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!targetUser) {
    throw new AuthServiceError("User not found");
  }

  const tempPassword = generateRandomPassword(12);
  const hashedPassword = await hashPassword(tempPassword);

  await prisma.user.update({
    where: { id: targetUserId },
    data: {
      password: hashedPassword,
      firstUse: true, // force password change
    },
  });

  return tempPassword;
};

// ── Refresh tokens ──────────────────────────────────────────────

export const refreshTokens = async (
  oldRefreshToken: string
): Promise<{ accessToken: string; refreshToken: string }> => {
  try {
    const decoded = jwt.verify(oldRefreshToken, JWT_REFRESH_SECRET) as unknown as UserPayload;

    // Re-fetch roles in case they changed
    const roles = await getUserRoles(decoded.sub);

    const payload: UserPayload = {
      sub: decoded.sub,
      email: decoded.email,
      roles,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    return { accessToken, refreshToken };
  } catch {
    throw new AuthServiceError("Invalid refresh token");
  }
};

// ── Forgot / reset password (public token flow) ─────────────────

/**
 * Generates a password-reset token for the given email.
 * In production this token would be emailed; for now it is returned
 * in the response (development / intranet mode).
 * Returns the raw token, or empty string if the email is not found
 * (caller should still return 200 to prevent user enumeration).
 */
export const requestPasswordReset = async (email: string): Promise<string> => {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  if (!user || user.status !== "active") {
    // Silently succeed to prevent user enumeration
    return "";
  }

  const rawToken = generateRawToken(); // 32-byte hex string
  const tokenHash = hashToken(rawToken);
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetToken: tokenHash,
      resetTokenExpire: expires,
    },
  });

  // In a production setup you would send an email here.
  console.log(
    `🔑 Password reset token for ${email}: ${rawToken}`
  );

  return rawToken;
};

/**
 * Validates the reset token and updates the user's password.
 */
export const resetPasswordWithToken = async (
  token: string,
  newPassword: string
): Promise<void> => {
  const tokenHash = hashToken(token);

  const user = await prisma.user.findFirst({
    where: {
      resetToken: tokenHash,
      resetTokenExpire: { gt: new Date() },
    },
  });

  if (!user) {
    throw new AuthServiceError("Invalid or expired reset token");
  }

  if (!isStrongPassword(newPassword)) {
    throw new AuthServiceError(
      "Password must be at least 8 characters and contain uppercase, lowercase, number, and special character"
    );
  }

  const hashedPassword = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpire: null,
      firstUse: false,
    },
  });
};

// ── Logout ──────────────────────────────────────────────────────

export const logoutUser = async (_refreshToken: string): Promise<void> => {
  // With stateless JWT (no RefreshToken table) clearing the cookie is enough.
};

// ── Email verification ──────────────────────────────────────────

export const verifyEmail = async (token: string): Promise<void> => {
  const tokenHash = hashToken(token);

  const user = await prisma.user.findFirst({
    where: {
      resetToken: tokenHash,
      resetTokenExpire: { gt: new Date() },
    },
  });

  if (!user) {
    throw new AuthServiceError("Invalid or expired verification token");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      resetToken: null,
      resetTokenExpire: null,
    },
  });
};

// ── Resend verification ─────────────────────────────────────────

export const resendVerification = async (email: string): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new AuthServiceError("User not found");
  }

  if (user.emailVerified) {
    throw new AuthServiceError("Email already verified");
  }

  const rawToken = generateRawToken();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetToken: hashToken(rawToken),
      resetTokenExpire: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  console.log(`📧 New verification link: ${process.env.APP_BASE_URL}/api/v1/auth/verify-email/${rawToken}`);
};

// ── Get user by ID (for /me endpoint) ───────────────────────────

export const getUserById = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      nom: true,
      prenom: true,
      sexe: true,
      telephone: true,
      photo: true,
      emailVerified: true,
      firstUse: true,
      status: true,
      lastLogin: true,
      createdAt: true,
      userRoles: {
        include: { role: true },
      },
      etudiant: {
        include: {
          promo: {
            include: {
              specialite: {
                include: { filiere: true },
              },
            },
          },
        },
      },
      enseignant: {
        include: { grade: true },
      },
    },
  });

  if (!user) {
    throw new AuthServiceError("User not found");
  }

  // Flatten roles for convenience
  return {
    ...user,
    roles: user.userRoles.map((ur: UserRoleWithRoleName) => ur.role.nom ?? "unknown"),
  };
};
