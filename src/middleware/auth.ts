
import type { Request, Response, NextFunction } from "express";
import type { Role } from "../../prisma/generated/prisma/enums";
import { jwtUtils } from "../utils/jwt";
import AppError from "../utils/appError";

const auth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AppError(401, "You are not authorized");
    }

    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw new AppError(401, "Invalid authorization format");
    }

    const secret = process.env.JWT_ACCESS_SECRET;

    if (!secret) {
      throw new AppError(500, "JWT access secret is not configured");
    }

    const result = jwtUtils.verifyToken(token, secret);

    if (!result.success) {
      throw new AppError(401, "Invalid or expired token");
    }

    const decoded = result.data as {
      id: string;
      email: string;
      role: Role;
    };

    req.user = decoded;

    next();
  } catch (error) {
    next(error);
  }
};

export default auth;