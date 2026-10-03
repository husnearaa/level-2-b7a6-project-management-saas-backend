
import type { Request, Response, NextFunction } from "express";
import type { Role } from "../../prisma/generated/prisma/enums";
import AppError from "../utils/appError";

const authorizeRole = (...allowedRoles: Role[]) => {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      return next(
        new AppError(401, "You are not authorized")
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          403,
          "You do not have permission to access this resource"
        )
      );
    }

    next();
  };
};

export default authorizeRole;