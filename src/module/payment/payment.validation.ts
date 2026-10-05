import { z } from "zod";

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

export const paymentIdSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});