import { Router } from "express";
import auth from "../../middleware/auth";
import validateRequest from "../../middleware/validateRequest";
import {
  createCheckoutSessionSchema,
  getMyPaymentsSchema,
} from "./payment.validation";
import { paymentController } from "./payment.controller";

const router = Router();

router.post(
  "/create-checkout-session",
  auth,
  validateRequest(createCheckoutSessionSchema),
  paymentController.createCheckoutSession,
);

router.get(
  "/my-payments",
  auth,
  validateRequest(getMyPaymentsSchema),
  paymentController.getMyPayments,
);

// Stripe Webhook
router.post(
  "/webhook",
  paymentController.stripeWebhook,
);

export default router;