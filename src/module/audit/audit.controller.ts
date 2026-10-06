import type { Request, Response } from "express";
import { sendResponse } from "../../utils/sendResponse";
import { auditService } from "./audit.service";
import type { IAuditLogQuery } from "./audit.interface";
import { catchAsync } from "../../utils/catchAsync";

const getAuditLogs = catchAsync(
  async (req: Request, res: Response) => {
    const result = await auditService.getAuditLogs(
      req.query as unknown as IAuditLogQuery,
    );

    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Audit logs retrieved successfully",
      data: result.data,
      meta: result.meta,
    });
  },
);

export const auditController = {
  getAuditLogs,
};