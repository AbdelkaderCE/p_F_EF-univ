import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";
import prisma from "../config/database";

/**
 * Get all permission codes for a user by looking up their roles → role_permissions → permissions.
 */
const getUserPermissions = async (userId: number): Promise<string[]> => {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: { permission: true },
          },
        },
      },
    },
  });

  const permissions = new Set<string>();
  for (const ur of userRoles) {
    for (const rp of ur.role.rolePermissions) {
      if (rp.permission.nom) {
        permissions.add(rp.permission.nom);
      }
    }
  }
  return Array.from(permissions);
};

/**
 * Require a single permission code.
 * Usage: requirePermission('users:create')
 */
export const requirePermission = (permissionCode: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        });
        return;
      }

      const permissions = await getUserPermissions(req.user.id);

      if (!permissions.includes(permissionCode)) {
        res.status(403).json({
          success: false,
          error: { code: "FORBIDDEN", message: "Permission denied" },
        });
        return;
      }

      next();
      return;
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Error checking permissions" },
      });
      return;
    }
  };
};

/**
 * Require any one of the given permission codes.
 * Usage: requireAnyPermission(['users:create', 'users:edit'])
 */
export const requireAnyPermission = (permissionCodes: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        });
        return;
      }

      const permissions = await getUserPermissions(req.user.id);
      const hasAny = permissionCodes.some((code) => permissions.includes(code));

      if (!hasAny) {
        res.status(403).json({
          success: false,
          error: { code: "FORBIDDEN", message: "Permission denied" },
        });
        return;
      }

      next();
      return;
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Error checking permissions" },
      });
      return;
    }
  };
};

/**
 * Require all of the given permission codes.
 * Usage: requireAllPermissions(['users:create', 'users:delete'])
 */
export const requireAllPermissions = (permissionCodes: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        });
        return;
      }

      const permissions = await getUserPermissions(req.user.id);
      const hasAll = permissionCodes.every((code) => permissions.includes(code));

      if (!hasAll) {
        res.status(403).json({
          success: false,
          error: { code: "FORBIDDEN", message: "Permission denied" },
        });
        return;
      }

      next();
      return;
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Error checking permissions" },
      });
      return;
    }
  };
};
