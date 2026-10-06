import { z } from "zod";
import { SubscriptionPlan } from "../../../prisma/generated/prisma/enums";

export const createCheckoutSessionSchema = z.object({
  body: z.object({
    plan: z
      .enum(SubscriptionPlan)
      .refine((value) => value !== SubscriptionPlan.FREE, {
        message: "FREE plan does not require payment",
      }),
  }),
});

export const getMyPaymentsSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),

    status: z
      .enum([
        "PENDING",
        "PAID",
        "FAILED",
        "CANCELED",
        "REFUNDED",
      ])
      .optional(),

    sortBy: z
      .enum(["createdAt", "amount", "status"])
      .optional(),

    sortOrder: z
      .enum(["asc", "desc"])
      .optional(),
  }),
});