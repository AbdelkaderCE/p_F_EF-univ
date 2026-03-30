import { Router } from "express";
import {
  register,
  login,
  refresh,
  logout,
  verifyEmailHandler,
  resendVerificationHandler,
  getMeHandler,
  changePasswordHandler,
  createUserByAdminHandler,
  adminResetPasswordHandler,
  listAdminUsersHandler,
  listRolesHandler,
  getAcademicManagementOptionsHandler,
  createSpecialiteManagementHandler,
  createPromoManagementHandler,
  createModuleManagementHandler,
  getAcademicAssignmentsHandler,
  assignStudentPromoHandler,
  assignTeacherModulesHandler,
  updateUserRolesByAdminHandler,
  updateUserStatusByAdminHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
} from "../../../controllers/auth/auth.controller";
import {
  loginLimiter,
  registerLimiter,
  refreshLimiter,
} from "../../../middlewares/rate-limit.middleware";
import { requireAuth, requireRole } from "../../../middlewares/auth.middleware";

const router = Router();

// ==================== PUBLIC ROUTES ====================
router.post("/register", registerLimiter, register);
router.post("/login", loginLimiter, login);
router.post("/refresh-token", refreshLimiter, refresh);
router.post("/logout", logout);

// ── Password reset (public — no auth required) ──────────────────
router.post("/forgot-password", forgotPasswordHandler);
router.post("/reset-password", resetPasswordHandler);

// ==================== EMAIL VERIFICATION ====================
router.get("/verify-email/:token", verifyEmailHandler);
router.post("/resend-verification", resendVerificationHandler);

// ==================== PROTECTED ROUTES (All authenticated users) ====================
router.get("/me", requireAuth, getMeHandler);
router.post("/change-password", requireAuth, changePasswordHandler);

// ==================== ADMIN ROUTES (Using permissions) ====================

// Create user - requires 'users:create' permission
router.post(
  "/admin/create-user",
  requireAuth,
  requireRole(["admin", "vice_doyen"]),
  createUserByAdminHandler
);

// Reset password - requires 'users:edit' permission
router.post(
  "/admin/reset-password/:userId",
  requireAuth,
  requireRole(["admin", "vice_doyen"]),
  adminResetPasswordHandler
);

router.get(
  "/admin/users",
  requireAuth,
  requireRole(["admin", "vice_doyen"]),
  listAdminUsersHandler
);

router.get(
  "/admin/roles",
  requireAuth,
  requireRole(["admin", "vice_doyen"]),
  listRolesHandler
);

router.put(
  "/admin/users/:userId/roles",
  requireAuth,
  requireRole(["admin", "vice_doyen"]),
  updateUserRolesByAdminHandler
);

router.put(
  "/admin/users/:userId/status",
  requireAuth,
  requireRole(["admin", "vice_doyen"]),
  updateUserStatusByAdminHandler
);

router.get(
  "/admin/academic/options",
  requireAuth,
  requireRole(["admin", "vice_doyen"]),
  getAcademicManagementOptionsHandler
);

router.post(
  "/admin/academic/specialites",
  requireAuth,
  requireRole(["admin", "vice_doyen"]),
  createSpecialiteManagementHandler
);

router.post(
  "/admin/academic/promos",
  requireAuth,
  requireRole(["admin", "vice_doyen"]),
  createPromoManagementHandler
);

router.post(
  "/admin/academic/modules",
  requireAuth,
  requireRole(["admin", "vice_doyen"]),
  createModuleManagementHandler
);

router.get(
  "/admin/academic/assignments",
  requireAuth,
  requireRole(["admin", "vice_doyen"]),
  getAcademicAssignmentsHandler
);

router.put(
  "/admin/academic/assignments/students/:userId",
  requireAuth,
  requireRole(["admin", "vice_doyen"]),
  assignStudentPromoHandler
);

router.put(
  "/admin/academic/assignments/teachers/:userId",
  requireAuth,
  requireRole(["admin", "vice_doyen"]),
  assignTeacherModulesHandler
);

export default router;
