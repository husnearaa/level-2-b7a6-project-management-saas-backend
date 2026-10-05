import { Router } from "express";

import auth from "../../middleware/auth";
import validateRequest from "../../middleware/validateRequest";

import { paymentController } from "./payment.controller";

import {
  createCheckoutSessionSchema,
  getMyPaymentsSchema,
} from "./payment.validation";

const router = Router();

/*
 * Create Stripe Checkout Session
 */
router.post(
  "/create-checkout-session",
  auth,
  validateRequest(
    createCheckoutSessionSchema
  ),
  paymentController.createCheckoutSession
);

/*
 * Get logged-in user's payments
 */
router.get(
  "/my-payments",
  auth,
  validateRequest(
    getMyPaymentsSchema
  ),
  paymentController.getMyPayments
);

export default router;