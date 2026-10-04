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
    // 1. Check Authorization header
    const authHeader = req.headers.authorization;

    // 2. Check custom x-access-token header
    const customToken = req.headers["x-access-token"];

    let token: string | undefined;

    if (authHeader) {
      const [scheme, bearerToken] = authHeader.split(" ");

      if (scheme !== "Bearer" || !bearerToken) {
        throw new AppError(
          401,
          "Invalid authorization format"
        );
      }

      token = bearerToken;
    } else if (typeof customToken === "string") {
      token = customToken;
    }

    if (!token) {
      throw new AppError(
        401,
        "Access token is required"
      );
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