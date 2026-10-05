import type { Request, Response } from "express";
import httpStatus from "http-status";

import { projectService } from "./project.service";
import { sendResponse } from "../../utils/sendResponse";

const createProject = async (req: Request, res: Response) => {
  const result = await projectService.createProject(
    req.user!.id,
    req.user!.role,
    req.body
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Project created successfully",
    data: result,
  });
};

const getProjects = async (req: Request, res: Response) => {
  const result = await projectService.getProjects(
    req.user!.id,
    req.user!.role,
    req.query
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Projects retrieved successfully",
    data: result.projects,
    meta: result.meta,
  });
};

const getSingleProject = async (req: Request, res: Response) => {
  const result = await projectService.getSingleProject(
    req.user!.id,
    req.user!.role,
    req.params.id as string
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Project retrieved successfully",
    data: result,
  });
};

const updateProject = async (req: Request, res: Response) => {
  const result = await projectService.updateProject(
    req.user!.id,
    req.user!.role,
    req.params.id as string,
    req.body
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Project updated successfully",
    data: result,
  });
};

const deleteProject = async (req: Request, res: Response) => {
  const result = await projectService.deleteProject(
    req.user!.id,
    req.user!.role,
    req.params.id as string
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Project deleted successfully",
    data: result,
  });
};

const addMember = async (req: Request, res: Response) => {
  const result = await projectService.addMember(
    req.user!.id,
    req.user!.role,
    req.params.id as string,
    req.body
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Project member added successfully",
    data: result,
  });
};

const removeMember = async (req: Request, res: Response) => {
  const result = await projectService.removeMember(
    req.user!.id,
    req.user!.role,
    req.params.id as string,
    req.params.userId as string
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Project member removed successfully",
    data: result,
  });
};

const projectController = {
  createProject,
  getProjects,
  getSingleProject,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
};

export default projectController;