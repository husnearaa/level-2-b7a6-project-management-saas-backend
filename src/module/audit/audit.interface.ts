import type {
  AuditAction,
  AuditEntity,
} from "../../../prisma/generated/prisma/enums";

export interface IAuditLogQuery {
  page?: string;
  limit?: string;
  action?: AuditAction;
  entity?: AuditEntity;
  userId?: string;
  sortOrder?: "asc" | "desc";
}