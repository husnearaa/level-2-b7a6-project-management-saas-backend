import type { Request, Response } from "express";
import { sendResponse } from "../../utils/sendResponse";
import { adminService } from "./admin.service";
import type { IAdminUserQuery } from "./admin.interface";
import { catchAsync } from "../../utils/catchAsync";

const getUsers = catchAsync(
  async (req: Request, res: Response) => {
    const result = await adminService.getUsers(
      req.query as unknown as IAdminUserQuery,
    );

    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Users retrieved successfully",
      data: result.data,
      meta: result.meta,
    });
  },
);

const updateUserRole = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.params.id as string;

    const result =
      await adminService.updateUserRole(
        req.user!.id,
        userId,
        req.body,
      );

    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "User role updated successfully",
      data: result,
    });
  },
);

const updateUserStatus = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.params.id as string;

    const result =
      await adminService.updateUserStatus(
        req.user!.id,
        userId,
        req.body,
      );

    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "User status updated successfully",
      data: result,
    });
  },
);

const getDashboardStats = catchAsync(
  async (req: Request, res: Response) => {
    const result =
      await adminService.getDashboardStats();

    sendResponse(res, {
      success: true,
      statusCode: 200,
      message:
        "Admin dashboard statistics retrieved successfully",
      data: result,
    });
  },
);

export const adminController = {
  getUsers,
  updateUserRole,
  updateUserStatus,
  getDashboardStats,
};