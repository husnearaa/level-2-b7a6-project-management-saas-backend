import type { Request, Response } from "express";
import httpStatus from "http-status";

import { taskService } from "./task.service";
import { sendResponse } from "../../utils/sendResponse";

const createTask = async (
  req: Request,
  res: Response
) => {
  const result =
    await taskService.createTask(
      req.user!.id,
      req.user!.role,
      req.body
    );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Task created successfully",
    data: result,
  });
};

const getTasks = async (
  req: Request,
  res: Response
) => {
  const result =
    await taskService.getTasks(
      req.user!.id,
      req.user!.role,
      req.query
    );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Tasks retrieved successfully",
    data: result.tasks,
    meta: result.meta,
  });
};

const getSingleTask = async (
  req: Request,
  res: Response
) => {
  const result =
    await taskService.getSingleTask(
      req.user!.id,
      req.user!.role,
      req.params.id as string
    );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Task retrieved successfully",
    data: result,
  });
};

const updateTask = async (
  req: Request,
  res: Response
) => {
  const result =
    await taskService.updateTask(
      req.user!.id,
      req.user!.role,
      req.params.id as string,
      req.body
    );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Task updated successfully",
    data: result,
  });
};

const deleteTask = async (
  req: Request,
  res: Response
) => {
  const result =
    await taskService.deleteTask(
      req.user!.id,
      req.user!.role,
      req.params.id as string
    );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Task deleted successfully",
    data: result,
  });
};

const assignTask = async (
  req: Request,
  res: Response
) => {
  const result =
    await taskService.assignTask(
      req.user!.id,
      req.user!.role,
      req.params.id as string,
      req.body
    );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Task assigned successfully",
    data: result,
  });
};

const changeTaskStatus = async (
  req: Request,
  res: Response
) => {
  const result =
    await taskService.changeTaskStatus(
      req.user!.id,
      req.user!.role,
      req.params.id as string,
      req.body
    );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Task status updated successfully",
    data: result,
  });
};

const getMyTasks = async (
  req: Request,
  res: Response
) => {
  const result =
    await taskService.getMyTasks(
      req.user!.id,
      req.query
    );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "My tasks retrieved successfully",
    data: result.tasks,
    meta: result.meta,
  });
};

const taskController = {
  createTask,
  getTasks,
  getSingleTask,
  updateTask,
  deleteTask,
  assignTask,
  changeTaskStatus,
  getMyTasks,
};

export default taskController;