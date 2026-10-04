import { Router } from "express";

import authController from "./auth.controller";

import validateRequest from "../../middleware/validateRequest";
import auth from "../../middleware/auth";

import {
  registerSchema,
  loginSchema,
  googleLoginSchema,
  refreshTokenSchema,
} from "./auth.validation";

const router = Router();

// Register
router.post(
  "/register",
  validateRequest(registerSchema),
  authController.registerUser
);

// Login
router.post(
  "/login",
  validateRequest(loginSchema),
  authController.loginUser
);

// Google Login
router.post(
  "/google",
  validateRequest(googleLoginSchema),
  authController.googleLogin
);

// Refresh Access Token
router.post(
  "/refresh-token",
  validateRequest(refreshTokenSchema),
  authController.refreshAccessToken
);

// Logout
router.post(
  "/logout",
  auth,
  validateRequest(refreshTokenSchema),
  authController.logoutUser
);

// Get Current User
router.get(
  "/me",
  auth,
  authController.getMe
);

export default router;