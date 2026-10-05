import bcrypt from "bcryptjs";
import { Role, ProjectStatus } from "../../../prisma/generated/prisma/enums";

import { prisma } from "../../lib/prisma";
import config from "../../config";

import AppError from "../../utils/appError";

import type {
  IChangePasswordPayload,
  IMyProjectsQuery,
  IUpdateProfilePayload,
} from "./user.interface";

const getMyProfile = async (userId: string) => {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      isDeleted: false,
    },
    select: {
      id: true,
      name: true,
      email: true,
      googleId: true,
      authProvider: true,
      emailVerified: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  return user;
};

const updateMyProfile = async (
  userId: string,
  payload: IUpdateProfilePayload
) => {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      isDeleted: false,
    },
  });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  if (payload.email) {
    const email = payload.email.toLowerCase().trim();

    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        id: {
          not: userId,
        },
        isDeleted: false,
      },
    });

    if (existingUser) {
      throw new AppError(
        409,
        "This email is already in use"
      );
    }

    payload.email = email;
  }

  const updatedUser = await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      ...(payload.name !== undefined && {
        name: payload.name,
      }),
      ...(payload.email !== undefined && {
        email: payload.email,
      }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      googleId: true,
      authProvider: true,
      emailVerified: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return updatedUser;
};

const changePassword = async (
  userId: string,
  payload: IChangePasswordPayload
) => {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      isDeleted: false,
    },
  });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  if (!user.password) {
    throw new AppError(
      400,
      "Password change is not available for Google accounts"
    );
  }

  const isPasswordCorrect = await bcrypt.compare(
    payload.currentPassword,
    user.password
  );

  if (!isPasswordCorrect) {
    throw new AppError(
      400,
      "Current password is incorrect"
    );
  }

  const hashedPassword = await bcrypt.hash(
    payload.newPassword,
    config.BCRYPT_SALT_ROUNDS
  );

  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      password: hashedPassword,
    },
  });

  // Invalidate existing refresh tokens after password change.
  await prisma.refreshToken.deleteMany({
    where: {
      userId,
    },
  });

  return null;
};

const getMyProjects = async (
  userId: string,
  query: IMyProjectsQuery
) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(
    Math.max(Number(query.limit) || 10, 1),
    100
  );

  const skip = (page - 1) * limit;

  const search = query.search?.trim();

  const status =
    query.status &&
    Object.values(ProjectStatus).includes(
      query.status as ProjectStatus
    )
      ? (query.status as ProjectStatus)
      : undefined;

  const where = {
    isDeleted: false,

    ...(status && {
      status,
    }),

    ...(search && {
      OR: [
        {
          name: {
            contains: search,
            mode: "insensitive" as const,
          },
        },
        {
          description: {
            contains: search,
            mode: "insensitive" as const,
          },
        },
      ],
    }),

    OR: [
      {
        managerId: userId,
      },
      {
        creatorId: userId,
      },
      {
        members: {
          some: {
            userId,
          },
        },
      },
    ],
  };

  const allowedSortFields = [
    "createdAt",
    "updatedAt",
    "name",
    "deadline",
  ] as const;

  const sortBy = allowedSortFields.includes(
    query.sortBy as (typeof allowedSortFields)[number]
  )
    ? query.sortBy!
    : "createdAt";

  const sortOrder =
    query.sortOrder === "asc" ? "asc" : "desc";

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        deadline: true,
        createdAt: true,
        updatedAt: true,

        manager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        _count: {
          select: {
            members: true,
            tasks: true,
          },
        },
      },
    }),

    prisma.project.count({
      where,
    }),
  ]);

  return {
    projects,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const userService = {
  getMyProfile,
  updateMyProfile,
  changePassword,
  getMyProjects,
};