import type { Request, Response } from "express";
import httpStatus from "http-status";

import { authService } from "./auth.service";
import { sendResponse } from "../../utils/sendResponse";

const registerUser = async (req: Request, res: Response) => {
  const result = await authService.registerUser(req.body);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "User registered successfully",
    data: result,
  });
};

export const authController = {
  registerUser,
};