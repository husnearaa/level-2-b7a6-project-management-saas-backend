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
      throw new AppError(401, "Access token is required");
    }

    let token: string;

    // Method 1:
    // Authorization: Bearer <token>
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    } else {
      // Method 2:
      // Authorization: <token>
      token = authHeader.trim();
    }

    if (!token) {
      throw new AppError(401, "Access token is required");
    }

    const secret = process.env.JWT_ACCESS_SECRET;

    if (!secret) {
      throw new AppError(
        500,
        "JWT access secret is not configured"
      );
    }

    const result = jwtUtils.verifyToken(
      token,
      secret
    );

    if (!result.success) {
      throw new AppError(
        401,
        "Invalid or expired token"
      );
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