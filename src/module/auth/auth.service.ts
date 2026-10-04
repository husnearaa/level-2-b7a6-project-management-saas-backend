import bcrypt from "bcryptjs";

import {
  AuthProvider,
  Role,
  UserStatus,
  AuditAction,
  AuditEntity,
} from "../../../prisma/generated/prisma/enums";

import { prisma } from "../../lib/prisma";

import config from "../../config";

import AppError from "../../utils/appError";
import { jwtUtils } from "../../utils/jwt";

import type {
  IRegisterPayload,
  ILoginPayload,
  IGoogleLoginPayload,
} from "./auth.interface";
import { verifyGoogleIdToken } from "../../lib/googleAuth";

// =========================
// Register
// =========================

const registerUser = async (payload: IRegisterPayload) => {
  const { name, email, password } = payload;

  const normalizedEmail = email.toLowerCase().trim();

  const existingUser = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (existingUser) {
    throw new AppError(
      409,
      "User with this email already exists"
    );
  }

  const hashedPassword = await bcrypt.hash(
    password,
    config.BCRYPT_SALT_ROUNDS
  );

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,

        // Public registration can only create MEMBER
        role: Role.MEMBER,

        status: UserStatus.ACTIVE,

        authProvider: AuthProvider.CREDENTIAL,

        emailVerified: false,
      },

      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        authProvider: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: AuditAction.USER_REGISTERED,
        entity: AuditEntity.USER,
        entityId: user.id,

        newData: {
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });

    return user;
  });

  return result;
};

// =========================
// Login
// =========================

const loginUser = async (payload: ILoginPayload) => {
  const { email, password } = payload;

  const normalizedEmail = email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (!user || user.isDeleted) {
    throw new AppError(
      401,
      "Invalid email or password"
    );
  }

  if (user.status !== UserStatus.ACTIVE) {
    throw new AppError(
      403,
      "Your account is not active"
    );
  }

  if (!user.password) {
    throw new AppError(
      400,
      "This account does not use password login"
    );
  }

  const isPasswordMatched = await bcrypt.compare(
    password,
    user.password
  );

  if (!isPasswordMatched) {
    throw new AppError(
      401,
      "Invalid email or password"
    );
  }

  const tokenPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwtUtils.createToken(
    tokenPayload,
    config.JWT_ACCESS_SECRET,
    config.JWT_ACCESS_EXPIRES_IN
  );

  const refreshToken = jwtUtils.createToken(
    tokenPayload,
    config.JWT_REFRESH_SECRET,
    config.JWT_REFRESH_EXPIRES_IN
  );

  const refreshTokenExpiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000
  );

  await prisma.$transaction(async (tx) => {
    await tx.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: refreshTokenExpiresAt,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: AuditAction.USER_LOGIN,
        entity: AuditEntity.USER,
        entityId: user.id,
      },
    });
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      authProvider: user.authProvider,
      emailVerified: user.emailVerified,
    },

    accessToken,
    refreshToken,
  };
};

// =========================
// Google Login
// =========================

const googleLogin = async (
  payload: IGoogleLoginPayload
) => {
  const googleUser = await verifyGoogleIdToken(
    payload.idToken
  );

  let user = await prisma.user.findUnique({
    where: {
      googleId: googleUser.googleId,
    },
  });

  // If Google ID doesn't exist, check email
  if (!user) {
    user = await prisma.user.findUnique({
      where: {
        email: googleUser.email,
      },
    });
  }

  // Create new Google user
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: googleUser.name,
        email: googleUser.email,
        googleId: googleUser.googleId,

        password: null,

        // Google users are always MEMBER initially
        role: Role.MEMBER,

        status: UserStatus.ACTIVE,

        authProvider: AuthProvider.GOOGLE,
        emailVerified: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: AuditAction.USER_REGISTERED,
        entity: AuditEntity.USER,
        entityId: user.id,

        newData: {
          name: user.name,
          email: user.email,
          role: user.role,
          authProvider: user.authProvider,
        },
      },
    });
  } else {
    // Existing account
    if (user.isDeleted) {
      throw new AppError(
        403,
        "This account has been deleted"
      );
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new AppError(
        403,
        "Your account is not active"
      );
    }

    // Link Google account if necessary
    if (
      !user.googleId ||
      user.googleId !== googleUser.googleId
    ) {
      user = await prisma.user.update({
        where: {
          id: user.id,
        },

        data: {
          googleId: googleUser.googleId,
          emailVerified: true,
        },
      });
    }
  }

  const tokenPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwtUtils.createToken(
    tokenPayload,
    config.JWT_ACCESS_SECRET,
    config.JWT_ACCESS_EXPIRES_IN
  );

  const refreshToken = jwtUtils.createToken(
    tokenPayload,
    config.JWT_REFRESH_SECRET,
    config.JWT_REFRESH_EXPIRES_IN
  );

  const refreshTokenExpiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000
  );

  await prisma.$transaction(async (tx) => {
    await tx.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: refreshTokenExpiresAt,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: AuditAction.USER_LOGIN,
        entity: AuditEntity.USER,
        entityId: user.id,
      },
    });
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      authProvider: user.authProvider,
      emailVerified: user.emailVerified,
    },

    accessToken,
    refreshToken,
  };
};

// =========================
// Refresh Access Token
// =========================

const refreshAccessToken = async (
  refreshToken: string
) => {
  const storedToken =
    await prisma.refreshToken.findUnique({
      where: {
        token: refreshToken,
      },
    });

  if (!storedToken) {
    throw new AppError(
      401,
      "Invalid refresh token"
    );
  }

  if (storedToken.expiresAt < new Date()) {
    await prisma.refreshToken.delete({
      where: {
        id: storedToken.id,
      },
    });

    throw new AppError(
      401,
      "Refresh token has expired"
    );
  }

  const result = jwtUtils.verifyToken(
    refreshToken,
    config.JWT_REFRESH_SECRET
  );

  if (!result.success) {
    throw new AppError(
      401,
      "Invalid or expired refresh token"
    );
  }

  const decoded = result.data as {
    id: string;
    email: string;
    role: Role;
  };

  const user = await prisma.user.findUnique({
    where: {
      id: decoded.id,
    },
  });

  if (!user || user.isDeleted) {
    throw new AppError(
      401,
      "User account not found"
    );
  }

  if (user.status !== UserStatus.ACTIVE) {
    throw new AppError(
      403,
      "Your account is not active"
    );
  }

  const newAccessToken = jwtUtils.createToken(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    config.JWT_ACCESS_SECRET,
    config.JWT_ACCESS_EXPIRES_IN
  );

  return {
    accessToken: newAccessToken,
  };
};

// =========================
// Logout
// =========================

const logoutUser = async (
  refreshToken: string
) => {
  const storedToken =
    await prisma.refreshToken.findUnique({
      where: {
        token: refreshToken,
      },
    });

  if (storedToken) {
    await prisma.refreshToken.delete({
      where: {
        id: storedToken.id,
      },
    });
  }

  return null;
};

// =========================
// Get Current User
// =========================

const getMe = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },

    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      authProvider: true,
      emailVerified: true,
      isDeleted: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (
    !user ||
    user.status === UserStatus.BLOCKED ||
    user.isDeleted
  ) {
    throw new AppError(
      404,
      "User not found"
    );
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    authProvider: user.authProvider,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

// =========================
// Export
// =========================

export const authService = {
  registerUser,
  loginUser,
  googleLogin,
  refreshAccessToken,
  logoutUser,
  getMe,
};