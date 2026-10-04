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

const loginUser = async (req: Request, res: Response) => {
  const result = await authService.loginUser(req.body);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Login successful",
    data: result,
  });
};

const googleLogin = async (req: Request, res: Response) => {
  const result = await authService.googleLogin(req.body);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Google login successful",
    data: result,
  });
};

const refreshAccessToken = async (req: Request, res: Response) => {
  const result = await authService.refreshAccessToken(req.body);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Access token generated successfully",
    data: result,
  });
};

const logoutUser = async (req: Request, res: Response) => {
  const result = await authService.logoutUser(req.body.refreshToken);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Logged out successfully",
    data: result,
  });
};

const getMe = async (req: Request, res: Response) => {
  const result = await authService.getMe(req.user!.id);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "User information retrieved successfully",
    data: result,
  });
};

const authController = {
  registerUser,
  loginUser,
  googleLogin,
  refreshAccessToken,
  logoutUser,
  getMe,
};

export default authController;