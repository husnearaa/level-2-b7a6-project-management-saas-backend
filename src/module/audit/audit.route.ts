import { Router } from "express";
import auth from "../../middleware/auth";
import authorizeRole from "../../middleware/role";
import validateRequest from "../../middleware/validateRequest";
import { Role } from "../../../prisma/generated/prisma/enums";
import { auditController } from "./audit.controller";
import { getAuditLogsSchema } from "./audit.validation";

const router = Router();

router.get(
  "/audit-logs",
  auth,
  authorizeRole(Role.ADMIN),
  validateRequest(getAuditLogsSchema),
  auditController.getAuditLogs,
);

export default router;