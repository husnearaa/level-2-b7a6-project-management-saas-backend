import { Router } from "express";
import auth from "../../middleware/auth";
import validateRequest from "../../middleware/validateRequest";
import { paymentController } from "./payment.controller";
import {
  createCheckoutSessionSchema,
  paymentIdSchema,
} from "./payment.validation";



const router = Router();

router.post(
  "/create-checkout-session",
  auth,
  validateRequest(createCheckoutSessionSchema),
  paymentController.createCheckoutSession
);

router.get(
  "/:id",
  auth,
  validateRequest(paymentIdSchema),
  paymentController.getPaymentById
);

export default router;