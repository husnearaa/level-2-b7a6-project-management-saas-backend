import { Router } from "express";

import taskController from "./task.controller";
import auth from "../../middleware/auth";
import validateRequest from "../../middleware/validateRequest";

import {
  createTaskSchema,
  getTasksSchema,
  taskIdSchema,
  updateTaskSchema,
  assignTaskSchema,
  changeTaskStatusSchema,
  myTasksSchema,
} from "./task.validation";

const router = Router();

router.post(
  "/",
  auth,
  validateRequest(createTaskSchema),
  taskController.createTask
);

router.get(
  "/",
  auth,
  validateRequest(getTasksSchema),
  taskController.getTasks
);

router.get(
  "/my-tasks",
  auth,
  validateRequest(myTasksSchema),
  taskController.getMyTasks
);

router.get(
  "/:id",
  auth,
  validateRequest(taskIdSchema),
  taskController.getSingleTask
);

router.patch(
  "/:id",
  auth,
  validateRequest(updateTaskSchema),
  taskController.updateTask
);

router.delete(
  "/:id",
  auth,
  validateRequest(taskIdSchema),
  taskController.deleteTask
);

router.post(
  "/:id/assign",
  auth,
  validateRequest(assignTaskSchema),
  taskController.assignTask
);

router.patch(
  "/:id/status",
  auth,
  validateRequest(changeTaskStatusSchema),
  taskController.changeTaskStatus
);

export default router;