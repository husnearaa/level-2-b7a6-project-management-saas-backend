import { z } from "zod";

const paymentStatuses = [
  "PENDING",
  "PAID",
  "FAILED",
  "CANCELED",
  "REFUNDED",
] as const;

export const createCheckoutSessionSchema = z.object({
  body: z.object({
    amount: z
      .number()
      .positive("Amount must be greater than 0")
      .max(1000000, "Amount is too large"),

    currency: z
      .string()
      .min(3)
      .max(10)
      .optional(),

    description: z
      .string()
      .min(2)
      .max(200)
      .optional(),
  }),
});

export const getMyPaymentsSchema = z.object({
  query: z.object({
    page: z.string().optional(),

    limit: z.string().optional(),

    status: z
      .enum(paymentStatuses)
      .optional(),

    sortBy: z
      .enum([
        "createdAt",
        "updatedAt",
        "amount",
        "status",
        "paidAt",
      ])
      .optional(),

    sortOrder: z
      .enum(["asc", "desc"])
      .optional(),
  }),
});