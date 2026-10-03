import { Router } from "express";

import { authController } from "./auth.controller";
import { registerSchema } from "./auth.validation";

import validateRequest from "../../middleware/validateRequest";

const router = Router();

router.post(
  "/register",
  validateRequest(registerSchema),
  authController.registerUser
);

export default router;