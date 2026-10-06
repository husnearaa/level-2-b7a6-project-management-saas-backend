import { z } from "zod";

export const getAuditLogsSchema = z.object({
  query: z.object({
    page: z.string().optional(),

    limit: z.string().optional(),

    action: z
      .enum([
        "USER_REGISTERED",
        "USER_LOGIN",
        "USER_ROLE_CHANGED",
        "USER_STATUS_CHANGED",
        "PROJECT_CREATED",
        "PROJECT_UPDATED",
        "PROJECT_DELETED",
        "MEMBER_ADDED",
        "MEMBER_REMOVED",
        "TASK_CREATED",
        "TASK_UPDATED",
        "TASK_DELETED",
        "TASK_ASSIGNED",
        "TASK_STATUS_CHANGED",
        "PAYMENT_CREATED",
        "PAYMENT_COMPLETED",
        "PAYMENT_FAILED",
        "SUBSCRIPTION_UPDATED",
      ])
      .optional(),

    entity: z
      .enum([
        "USER",
        "PROJECT",
        "PROJECT_MEMBER",
        "TASK",
        "PAYMENT",
        "SUBSCRIPTION",
      ])
      .optional(),

    userId: z.string().uuid().optional(),

    sortOrder: z
      .enum(["asc", "desc"])
      .optional(),
  }),
});