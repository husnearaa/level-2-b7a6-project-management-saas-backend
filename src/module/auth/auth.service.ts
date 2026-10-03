import bcrypt from "bcryptjs";

import {
  Role,
  AuthProvider,
  UserStatus,
  AuditAction,
  AuditEntity,
} from "../../../prisma/generated/prisma/enums";

import config from "../../config";
import { prisma } from "../../lib/prisma";
import AppError from "../../utils/appError";

const registerUser = async (payload: {
  name: string;
  email: string;
  password: string;
}) => {
  const { name, email, password } = payload;

  const normalizedEmail = email.toLowerCase().trim();

  // Check if user already exists
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

  // Hash password
  const hashedPassword = await bcrypt.hash(
    password,
    config.BCRYPT_SALT_ROUNDS
  );

  // Create user + audit log together
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,

        // Public registration always creates MEMBER
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

    // Create audit log
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

export const authService = {
  registerUser,
};