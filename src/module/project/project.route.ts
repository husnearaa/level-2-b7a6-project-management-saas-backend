import { Router } from "express";

import projectController from "./project.controller";

import auth from "../../middleware/auth";
import validateRequest from "../../middleware/validateRequest";

import {
  createProjectSchema,
  updateProjectSchema,
  projectIdSchema,
  getProjectsSchema,
  addProjectMemberSchema,
  removeProjectMemberSchema,
} from "./project.validation";

const router = Router();

router.post(
  "/create-project",
  auth,
  validateRequest(createProjectSchema),
  projectController.createProject
);

router.get(
  "/",
  auth,
  validateRequest(getProjectsSchema),
  projectController.getProjects
);

router.get(
  "/:id",
  auth,
  validateRequest(projectIdSchema),
  projectController.getSingleProject
);

router.patch(
  "/:id",
  auth,
  validateRequest(updateProjectSchema),
  projectController.updateProject
);

router.delete(
  "/:id",
  auth,
  validateRequest(projectIdSchema),
  projectController.deleteProject
);

router.post(
  "/:id/members",
  auth,
  validateRequest(addProjectMemberSchema),
  projectController.addMember
);

router.delete(
  "/:id/members/:userId",
  auth,
  validateRequest(removeProjectMemberSchema),
  projectController.removeMember
);

export default router;