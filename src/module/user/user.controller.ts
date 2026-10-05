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

export const userController = {
  getMyProfile,
};