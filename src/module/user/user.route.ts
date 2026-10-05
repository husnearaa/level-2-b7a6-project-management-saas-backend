import { Router } from "express";

import userController from "./user.controller";
import validateRequest from "../../middleware/validateRequest";
import auth from "../../middleware/auth";

import {
  updateProfileSchema,
  changePasswordSchema,
  getMyProjectsSchema,
} from "./user.validation";

const router = Router();

router.get(
  "/me",
  auth,
  userController.getMyProfile
);

router.patch(
  "/update-profile",
  auth,
  validateRequest(updateProfileSchema),
  userController.updateMyProfile
);

router.patch(
  "/change-password",
  auth,
  validateRequest(changePasswordSchema),
  userController.changePassword
);

router.get(
  "/me/projects",
  auth,
  validateRequest(getMyProjectsSchema),
  userController.getMyProjects
);

export default router;