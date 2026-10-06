import {
  Role,
  UserStatus,
} from "../../../prisma/generated/prisma/enums";

import { prisma } from "../../lib/prisma";
import AppError from "../../utils/appError";

import type {
  IAdminUserQuery,
  IUpdateUserRolePayload,
  IUpdateUserStatusPayload,
} from "./admin.interface";

const getUsers = async (
  query: IAdminUserQuery,
) => {
  const page = Math.max(Number(query.page) || 1, 1);

  const limit = Math.min(
    Math.max(Number(query.limit) || 10, 1),
    100,
  );

  const skip = (page - 1) * limit;

  const where = {
    isDeleted: false,

    ...(query.role
      ? {
          role: query.role,
        }
      : {}),

    ...(query.status
      ? {
          status: query.status,
        }
      : {}),

    ...(query.search
      ? {
          OR: [
            {
              name: {
                contains: query.search,
                mode: "insensitive" as const,
              },
            },
            {
              email: {
                contains: query.search,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
  };

  const sortBy = query.sortBy || "createdAt";
  const sortOrder = query.sortOrder || "desc";

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      skip,
      take: limit,

      orderBy: {
        [sortBy]: sortOrder,
      },

      select: {
        id: true,
        name: true,
        email: true,
        authProvider: true,
        emailVerified: true,
        role: true,
        status: true,
        isDeleted: true,
        createdAt: true,
        updatedAt: true,
      },
    }),

    prisma.user.count({
      where,
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data: users,
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
  };
};

const updateUserRole = async (
  adminId: string,
  userId: string,
  payload: IUpdateUserRolePayload,
) => {
  if (adminId === userId) {
    throw new AppError(
      400,
      "You cannot change your own role",
    );
  }

  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      isDeleted: false,
    },

    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
    },
  });

  if (!user) {
    throw new AppError(
      404,
      "User not found",
    );
  }

  if (user.role === payload.role) {
    throw new AppError(
      400,
      "User already has this role",
    );
  }

  const updatedUser = await prisma.$transaction(
    async (tx) => {
      const result = await tx.user.update({
        where: {
          id: userId,
        },

        data: {
          role: payload.role,
        },

        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          updatedAt: true,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: "USER_ROLE_CHANGED",
          entity: "USER",
          entityId: userId,

          oldData: {
            role: user.role,
          },

          newData: {
            role: payload.role,
          },
        },
      });

      return result;
    },
  );

  return updatedUser;
};

const updateUserStatus = async (
  adminId: string,
  userId: string,
  payload: IUpdateUserStatusPayload,
) => {
  if (adminId === userId) {
    throw new AppError(
      400,
      "You cannot change your own status",
    );
  }

  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      isDeleted: false,
    },

    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
    },
  });

  if (!user) {
    throw new AppError(
      404,
      "User not found",
    );
  }

  if (user.status === payload.status) {
    throw new AppError(
      400,
      "User already has this status",
    );
  }

  const updatedUser = await prisma.$transaction(
    async (tx) => {
      const result = await tx.user.update({
        where: {
          id: userId,
        },

        data: {
          status: payload.status,
        },

        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          updatedAt: true,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: "USER_STATUS_CHANGED",
          entity: "USER",
          entityId: userId,

          oldData: {
            status: user.status,
          },

          newData: {
            status: payload.status,
          },
        },
      });

      return result;
    },
  );

  return updatedUser;
};

const getDashboardStats = async () => {
  const [
    totalUsers,
    activeUsers,
    inactiveUsers,
    blockedUsers,
    totalProjects,
    activeProjects,
    completedProjects,
    totalTasks,
    todoTasks,
    inProgressTasks,
    completedTasks,
    totalPayments,
    paidPayments,
    pendingPayments,
    failedPayments,
    activeSubscriptions,
  ] = await prisma.$transaction([
    prisma.user.count({
      where: {
        isDeleted: false,
      },
    }),

    prisma.user.count({
      where: {
        isDeleted: false,
        status: UserStatus.ACTIVE,
      },
    }),

    prisma.user.count({
      where: {
        isDeleted: false,
        status: UserStatus.INACTIVE,
      },
    }),

    prisma.user.count({
      where: {
        isDeleted: false,
        status: UserStatus.BLOCKED,
      },
    }),

    prisma.project.count({
      where: {
        isDeleted: false,
      },
    }),

    prisma.project.count({
      where: {
        isDeleted: false,
        status: "ACTIVE",
      },
    }),

    prisma.project.count({
      where: {
        isDeleted: false,
        status: "COMPLETED",
      },
    }),

    prisma.task.count({
      where: {
        isDeleted: false,
      },
    }),

    prisma.task.count({
      where: {
        isDeleted: false,
        status: "TODO",
      },
    }),

    prisma.task.count({
      where: {
        isDeleted: false,
        status: "IN_PROGRESS",
      },
    }),

    prisma.task.count({
      where: {
        isDeleted: false,
        status: "COMPLETED",
      },
    }),

    prisma.payment.count(),

    prisma.payment.count({
      where: {
        status: "PAID",
      },
    }),

    prisma.payment.count({
      where: {
        status: "PENDING",
      },
    }),

    prisma.payment.count({
      where: {
        status: "FAILED",
      },
    }),

    prisma.subscription.count({
      where: {
        status: "ACTIVE",
      },
    }),
  ]);

  return {
    users: {
      total: totalUsers,
      active: activeUsers,
      inactive: inactiveUsers,
      blocked: blockedUsers,
    },

    projects: {
      total: totalProjects,
      active: activeProjects,
      completed: completedProjects,
    },

    tasks: {
      total: totalTasks,
      todo: todoTasks,
      inProgress: inProgressTasks,
      completed: completedTasks,
    },

    payments: {
      total: totalPayments,
      paid: paidPayments,
      pending: pendingPayments,
      failed: failedPayments,
    },

    subscriptions: {
      active: activeSubscriptions,
    },
  };
};

export const adminService = {
  getUsers,
  updateUserRole,
  updateUserStatus,
  getDashboardStats,
};