import { Router } from "express";
import auth from "../../middleware/auth";
import authorizeRole from "../../middleware/role";
import validateRequest from "../../middleware/validateRequest";
import { Role } from "../../../prisma/generated/prisma/enums";


import {
  getAdminUsersSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
} from "./admin.validation";
import { adminController } from "./admin.controller";

const router = Router();

router.get(
  "/users",
  auth,
  authorizeRole(Role.ADMIN),
  validateRequest(getAdminUsersSchema),
  adminController.getUsers,
);

router.patch(
  "/users/:id/role",
  auth,
  authorizeRole(Role.ADMIN),
  validateRequest(updateUserRoleSchema),
  adminController.updateUserRole,
);

router.patch(
  "/users/:id/status",
  auth,
  authorizeRole(Role.ADMIN),
  validateRequest(updateUserStatusSchema),
  adminController.updateUserStatus,
);

router.get(
  "/dashboard-stats",
  auth,
  authorizeRole(Role.ADMIN),
  adminController.getDashboardStats,
);

export default router;