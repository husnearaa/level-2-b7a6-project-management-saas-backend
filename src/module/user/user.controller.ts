import type { Request, Response } from "express";
import httpStatus from "http-status";

import { userService } from "./user.service";
import { sendResponse } from "../../utils/sendResponse";

const getMyProfile = async (
  req: Request,
  res: Response
) => {
  const result = await userService.getMyProfile(
    req.user!.id
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Profile retrieved successfully",
    data: result,
  });
};

const updateMyProfile = async (
  req: Request,
  res: Response
) => {
  const result = await userService.updateMyProfile(
    req.user!.id,
    req.body
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Profile updated successfully",
    data: result,
  });
};

const changePassword = async (
  req: Request,
  res: Response
) => {
  const result = await userService.changePassword(
    req.user!.id,
    req.body
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Password changed successfully",
    data: result,
  });
};

const getMyProjects = async (
  req: Request,
  res: Response
) => {
  const result = await userService.getMyProjects(
    req.user!.id,
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

const userController = {
  getMyProfile,
  updateMyProfile,
  changePassword,
  getMyProjects,
};

export default userController;