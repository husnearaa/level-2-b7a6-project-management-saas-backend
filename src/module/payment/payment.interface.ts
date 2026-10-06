import type {
  PaymentStatus,
  SubscriptionPlan,
} from "../../../prisma/generated/prisma/enums";

export interface ICreateCheckoutPayload {
  plan: Exclude<SubscriptionPlan, "FREE">;
}

export interface IPaymentQuery {
  page?: string;
  limit?: string;
  status?: PaymentStatus;
  sortBy?: "createdAt" | "amount" | "status";
  sortOrder?: "asc" | "desc";
}

export interface IStripeWebhookResult {
  received: boolean;
  message: string;
}