import prisma from "../../config/database";
import type { Prisma } from "@prisma/client";
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

const getUserRoles = async (userId: number): Promise<string[]> => {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: true },
  });
  return userRoles.map((ur: UserRoleWithRoleName) => ur.role.nom ?? "unknown");
};

const buildPayload = (user: { id: number; email: string }, roles: string[]): UserPayload => ({
  sub: user.id,
  email: user.email,
  roles,
});

const ROLE_ALIAS_MAP: Record<string, "admin" | "enseignant" | "etudiant"> = {
  admin: "admin",
  teacher: "enseignant",
  enseignant: "enseignant",
  student: "etudiant",
  etudiant: "etudiant",
};

const ADMIN_ROLE = "admin";
const TEACHER_ROLE = "enseignant";
const STUDENT_ROLE = "etudiant";

const normalizeRoleNames = (roleNames: string[]) => {
  const normalized: Array<"admin" | "enseignant" | "etudiant"> = [];
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

export const validateRoles = (roleNames: string[]): { valid: boolean; error?: string } => {
  const { normalized, invalid } = normalizeRoleNames(roleNames);
  const normalizedRoles = new Set(normalized);

  if (invalid.length > 0) {
    return {
      valid: false,
      error: `Only admin, teacher, and student roles are allowed. Invalid: ${invalid.join(", ")}`,
    };
  }

  if (normalizedRoles.size === 0) {
    return {
      valid: false,
      error: "At least one role must be assigned to the user.",
    };
  }

  const hasTeacherRole = normalizedRoles.has(TEACHER_ROLE);
  const hasStudentRole = normalizedRoles.has(STUDENT_ROLE);

  if (hasTeacherRole && hasStudentRole) {
    return {
      valid: false,
      error:
        "Cannot assign both teacher and student roles to the same user. A user must be either teacher/staff or student.",
    };
  }

  return { valid: true };
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

  const rawToken = generateRawToken();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetToken: hashToken(rawToken),
      resetTokenExpire: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  console.log(`📧 Verification link: ${process.env.APP_BASE_URL}/api/v1/auth/verify-email/${rawToken}`);

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

  if (user.status !== "active") {
    throw new AuthServiceError("Account is suspended or inactive");
  }

  const isValidPassword = await comparePasswords(password, user.password);

  if (!isValidPassword) {
    const attempts = user.loginAttempts + 1;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: attempts,
        status: attempts >= 5 ? "suspended" : user.status,
      },
    });
    throw new AuthServiceError("Invalid email or password");
  }

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

export const createUserByAdmin = async (data: {
  email: string;
  nom: string;
  prenom: string;
  roleName?: string;
  roleNames?: string[];
  sexe?: "H" | "F";
  telephone?: string;
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

  const roleNormalization = normalizeRoleNames(requestedRoleNames);

  const roleValidation = validateRoles(requestedRoleNames);
  if (!roleValidation.valid) {
    throw new AuthServiceError(roleValidation.error || "Invalid role combination");
  }

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const newUser = await tx.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        nom: data.nom,
        prenom: data.prenom,
        sexe: data.sexe as any,
        telephone: data.telephone,
        firstUse: true,
      },
    });

    const roles = await tx.role.findMany({ where: { nom: { in: roleNormalization.normalized } } });
    if (roles.length !== roleNormalization.normalized.length) {
      const found = new Set(
        roles
          .map((role: RoleNameRecord) => role.nom)
          .filter((name: string | null): name is string => !!name)
      );
      const missing = roleNormalization.normalized.filter((name) => !found.has(name));
      throw new AuthServiceError(`Role(s) not found: ${missing.join(", ")}`);
    }

    await tx.userRole.createMany({
      data: roles.map((role: { id: number }) => ({ userId: newUser.id, roleId: role.id })),
      skipDuplicates: true,
    });

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

export const listRolesForAdmin = async (): Promise<Array<{ id: number; nom: string; description: string | null }>> => {
  const roles = await prisma.role.findMany({
    where: {
      nom: {
        in: [ADMIN_ROLE, TEACHER_ROLE, STUDENT_ROLE],
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
  adminUserId: number,
  targetUserId: number,
  roleNames: string[]
): Promise<{
  id: number;
  email: string;
  nom: string;
  prenom: string;
  roles: string[];
}> => {
  const adminRoles = await getUserRoles(adminUserId);
  const isAdmin = adminRoles.some((roleName) => ["admin", "vice_doyen"].includes(roleName));

  if (!isAdmin) {
    throw new AuthServiceError("Unauthorized: Only admins can update user roles");
  }

  const normalizedRoleNames = Array.from(
    new Set(
      roleNames
        .map((role) => role?.trim())
        .filter((role): role is string => !!role)
    )
  );

  const roleNormalization = normalizeRoleNames(normalizedRoleNames);

  if (roleNormalization.invalid.length > 0) {
    throw new AuthServiceError(
      `Only admin, teacher, and student roles are allowed. Invalid: ${roleNormalization.invalid.join(", ")}`
    );
  }

  if (roleNormalization.normalized.length === 0) {
    throw new AuthServiceError("At least one role is required");
  }

  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!targetUser) {
    throw new AuthServiceError("User not found");
  }

    // Validate roles to prevent mixing teacher and student roles
    const roleValidation = validateRoles(roleNormalization.normalized);
    if (!roleValidation.valid) {
      throw new AuthServiceError(roleValidation.error || "Invalid role combination");
    }
  
    const roles = await prisma.role.findMany({ where: { nom: { in: roleNormalization.normalized } } });
  if (roles.length !== roleNormalization.normalized.length) {
    const found = new Set(roles.map((role: RoleNameRecord) => role.nom).filter((name: string | null): name is string => !!name));
    const missing = roleNormalization.normalized.filter((name) => !found.has(name));
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
  adminUserId: number,
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
  const adminRoles = await getUserRoles(adminUserId);
  const isAdmin = adminRoles.some((roleName) => ["admin", "vice_doyen"].includes(roleName));

  if (!isAdmin) {
    throw new AuthServiceError("Unauthorized: Only admins can update user status");
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

export const adminResetPassword = async (
  adminUserId: number,
  targetUserId: number
): Promise<string> => {
  const adminRoles = await getUserRoles(adminUserId);
  const isAdmin = adminRoles.some((r) =>
    ["admin", "vice_doyen"].includes(r)
  );
  if (!isAdmin) {
    throw new AuthServiceError("Unauthorized: Only admins can reset passwords");
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
      firstUse: true,
    },
  });

  return tempPassword;
};

export const refreshTokens = async (
  oldRefreshToken: string
): Promise<{ accessToken: string; refreshToken: string }> => {
  try {
    const decoded = jwt.verify(oldRefreshToken, JWT_REFRESH_SECRET) as unknown as UserPayload;

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

export const requestPasswordReset = async (email: string): Promise<string> => {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  if (!user || user.status !== "active") {
    return "";
  }

  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);
  const expires = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetToken: tokenHash,
      resetTokenExpire: expires,
    },
  });

  console.log(`🔑 Password reset token for ${email}: ${rawToken}`);

  return rawToken;
};

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

export const logoutUser = async (_refreshToken: string): Promise<void> => {
  // Stateless JWT - clearing the cookie is enough
};

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

  return {
    ...user,
    roles: user.userRoles.map((ur: UserRoleWithRoleName) => ur.role.nom ?? "unknown"),
  };
};
