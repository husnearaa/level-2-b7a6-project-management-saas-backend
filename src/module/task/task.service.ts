import {
  Prisma,
} from "../../../prisma/generated/prisma/client";

import {
  Role,
  TaskPriority,
  TaskStatus,
} from "../../../prisma/generated/prisma/enums";

import { prisma } from "../../lib/prisma";
import AppError from "../../utils/appError";

import type {
  IAssignTaskPayload,
  IChangeTaskStatusPayload,
  ICreateTaskPayload,
  ITaskQuery,
  IUpdateTaskPayload,
} from "./task.interface";

const createTask = async (
  userId: string,
  userRole: Role,
  payload: ICreateTaskPayload
) => {
  if (
    userRole !== Role.ADMIN &&
    userRole !== Role.MANAGER
  ) {
    throw new AppError(
      403,
      "Only admin or manager can create a task"
    );
  }

  const project = await prisma.project.findFirst({
    where: {
      id: payload.projectId,
      isDeleted: false,
    },

    select: {
      id: true,
      name: true,
      managerId: true,
      creatorId: true,
    },
  });

  if (!project) {
    throw new AppError(404, "Project not found");
  }

  const canCreate =
    userRole === Role.ADMIN ||
    project.managerId === userId ||
    project.creatorId === userId;

  if (!canCreate) {
    throw new AppError(
      403,
      "You do not have permission to create a task in this project"
    );
  }

  if (payload.assignedToId) {
    const assignedUser = await prisma.user.findFirst({
      where: {
        id: payload.assignedToId,
        isDeleted: false,
        status: "ACTIVE",
      },

      select: {
        id: true,
      },
    });

    if (!assignedUser) {
      throw new AppError(
        404,
        "Assigned user not found or inactive"
      );
    }

    const isProjectMember =
      await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: payload.projectId,
            userId: payload.assignedToId,
          },
        },
      });

    const isProjectManager =
      project.managerId === payload.assignedToId;

    const isProjectCreator =
      project.creatorId === payload.assignedToId;

    if (
      !isProjectMember &&
      !isProjectManager &&
      !isProjectCreator
    ) {
      throw new AppError(
        400,
        "Assigned user must be a member of the project"
      );
    }
  }

  const task = await prisma.$transaction(
    async (tx) => {
      const newTask = await tx.task.create({
        data: {
          title: payload.title,

          ...(payload.description !== undefined && {
            description: payload.description,
          }),

          projectId: payload.projectId,
          createdById: userId,

          ...(payload.assignedToId !== undefined && {
            assignedToId: payload.assignedToId,
          }),

          ...(payload.priority !== undefined && {
            priority: payload.priority as TaskPriority,
          }),

          ...(payload.dueDate !== undefined && {
            dueDate: new Date(payload.dueDate),
          }),
        },

        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          projectId: true,
          assignedToId: true,
          createdById: true,
          dueDate: true,
          createdAt: true,
          updatedAt: true,

          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },

          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: "TASK_CREATED",
          entity: "TASK",
          entityId: newTask.id,
          newData:
            newTask as unknown as Prisma.InputJsonValue,
        },
      });

      return newTask;
    }
  );

  return task;
};

const getTasks = async (
  userId: string,
  userRole: Role,
  query: ITaskQuery
) => {
  const page = Math.max(
    Number(query.page) || 1,
    1
  );

  const limit = Math.min(
    Math.max(Number(query.limit) || 10, 1),
    100
  );

  const skip = (page - 1) * limit;

  const search = query.search?.trim();

  const status = query.status as
    | TaskStatus
    | undefined;

  const priority = query.priority as
    | TaskPriority
    | undefined;

  const where: Prisma.TaskWhereInput = {
    isDeleted: false,

    ...(status && {
      status,
    }),

    ...(priority && {
      priority,
    }),

    ...(query.projectId && {
      projectId: query.projectId,
    }),

    ...(query.assignedToId && {
      assignedToId: query.assignedToId,
    }),

    ...(search && {
      OR: [
        {
          title: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: search,
            mode: "insensitive",
          },
        },
      ],
    }),

    ...(userRole !== Role.ADMIN && {
      AND: [
        {
          OR: [
            {
              project: {
                managerId: userId,
              },
            },
            {
              project: {
                creatorId: userId,
              },
            },
            {
              project: {
                members: {
                  some: {
                    userId,
                  },
                },
              },
            },
          ],
        },
      ],
    }),
  };

  const sortBy = query.sortBy ?? "createdAt";

  const sortOrder =
    query.sortOrder === "asc"
      ? "asc"
      : "desc";

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,

      skip,
      take: limit,

      orderBy: {
        [sortBy]: sortOrder,
      },

      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        projectId: true,
        assignedToId: true,
        createdById: true,
        dueDate: true,
        createdAt: true,
        updatedAt: true,

        project: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },

        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },

        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    }),

    prisma.task.count({
      where,
    }),
  ]);

  return {
    tasks,

    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(
        total / limit
      ),
    },
  };
};

const getSingleTask = async (
  userId: string,
  userRole: Role,
  taskId: string
) => {
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      isDeleted: false,

      ...(userRole !== Role.ADMIN && {
        project: {
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
        },
      }),
    },

    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      projectId: true,
      assignedToId: true,
      createdById: true,
      dueDate: true,
      createdAt: true,
      updatedAt: true,

      project: {
        select: {
          id: true,
          name: true,
          status: true,
          managerId: true,
          creatorId: true,
        },
      },

      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
        },
      },

      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  if (!task) {
    throw new AppError(
      404,
      "Task not found or you do not have access"
    );
  }

  return task;
};

const updateTask = async (
  userId: string,
  userRole: Role,
  taskId: string,
  payload: IUpdateTaskPayload
) => {
  const existingTask =
    await prisma.task.findFirst({
      where: {
        id: taskId,
        isDeleted: false,
      },

      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        projectId: true,
        assignedToId: true,
        createdById: true,
        dueDate: true,

        project: {
          select: {
            managerId: true,
            creatorId: true,
          },
        },
      },
    });

  if (!existingTask) {
    throw new AppError(404, "Task not found");
  }

  const canUpdate =
    userRole === Role.ADMIN ||
    existingTask.project.managerId === userId ||
    existingTask.project.creatorId === userId ||
    existingTask.createdById === userId;

  if (!canUpdate) {
    throw new AppError(
      403,
      "You do not have permission to update this task"
    );
  }

  if (payload.assignedToId) {
    const assignedUser =
      await prisma.user.findFirst({
        where: {
          id: payload.assignedToId,
          isDeleted: false,
          status: "ACTIVE",
        },

        select: {
          id: true,
        },
      });

    if (!assignedUser) {
      throw new AppError(
        404,
        "Assigned user not found or inactive"
      );
    }

    const projectMember =
      await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: existingTask.projectId,
            userId: payload.assignedToId,
          },
        },
      });

    const isManager =
      existingTask.project.managerId ===
      payload.assignedToId;

    const isCreator =
      existingTask.project.creatorId ===
      payload.assignedToId;

    if (
      !projectMember &&
      !isManager &&
      !isCreator
    ) {
      throw new AppError(
        400,
        "Assigned user must be a member of the project"
      );
    }
  }

  const updatedTask =
    await prisma.$transaction(
      async (tx) => {
        const task = await tx.task.update({
          where: {
            id: taskId,
          },

          data: {
            ...(payload.title !== undefined && {
              title: payload.title,
            }),

            ...(payload.description !== undefined && {
              description: payload.description,
            }),

            ...(payload.priority !== undefined && {
              priority:
                payload.priority as TaskPriority,
            }),

            ...(payload.assignedToId !== undefined && {
              assignedToId:
                payload.assignedToId,
            }),

            ...(payload.dueDate !== undefined && {
              dueDate:
                payload.dueDate === null
                  ? null
                  : new Date(payload.dueDate),
            }),
          },

          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            priority: true,
            projectId: true,
            assignedToId: true,
            createdById: true,
            dueDate: true,
            createdAt: true,
            updatedAt: true,

            assignedTo: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        });

        await tx.auditLog.create({
          data: {
            userId,
            action: "TASK_UPDATED",
            entity: "TASK",
            entityId: taskId,
            oldData:
              existingTask as unknown as Prisma.InputJsonValue,
            newData:
              task as unknown as Prisma.InputJsonValue,
          },
        });

        return task;
      }
    );

  return updatedTask;
};

const deleteTask = async (
  userId: string,
  userRole: Role,
  taskId: string
) => {
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      isDeleted: false,
    },

    select: {
      id: true,
      title: true,
      projectId: true,
      createdById: true,

      project: {
        select: {
          managerId: true,
          creatorId: true,
        },
      },
    },
  });

  if (!task) {
    throw new AppError(404, "Task not found");
  }

  const canDelete =
    userRole === Role.ADMIN ||
    task.project.managerId === userId ||
    task.project.creatorId === userId ||
    task.createdById === userId;

  if (!canDelete) {
    throw new AppError(
      403,
      "You do not have permission to delete this task"
    );
  }

  const deletedTask =
    await prisma.$transaction(
      async (tx) => {
        const result =
          await tx.task.update({
            where: {
              id: taskId,
            },

            data: {
              isDeleted: true,
              deletedAt: new Date(),
            },

            select: {
              id: true,
              title: true,
              isDeleted: true,
              deletedAt: true,
            },
          });

        await tx.auditLog.create({
          data: {
            userId,
            action: "TASK_DELETED",
            entity: "TASK",
            entityId: taskId,
            oldData:
              task as unknown as Prisma.InputJsonValue,
            newData:
              result as unknown as Prisma.InputJsonValue,
          },
        });

        return result;
      }
    );

  return deletedTask;
};

const assignTask = async (
  userId: string,
  userRole: Role,
  taskId: string,
  payload: IAssignTaskPayload
) => {
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      isDeleted: false,
    },

    select: {
      id: true,
      title: true,
      projectId: true,
      assignedToId: true,

      project: {
        select: {
          managerId: true,
          creatorId: true,
        },
      },
    },
  });

  if (!task) {
    throw new AppError(404, "Task not found");
  }

  const canAssign =
    userRole === Role.ADMIN ||
    task.project.managerId === userId ||
    task.project.creatorId === userId;

  if (!canAssign) {
    throw new AppError(
      403,
      "You do not have permission to assign this task"
    );
  }

  const assignedUser =
    await prisma.user.findFirst({
      where: {
        id: payload.assignedToId,
        isDeleted: false,
        status: "ACTIVE",
      },

      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

  if (!assignedUser) {
    throw new AppError(
      404,
      "Assigned user not found or inactive"
    );
  }

  const isProjectMember =
    await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: task.projectId,
          userId: payload.assignedToId,
        },
      },
    });

  const isManager =
    task.project.managerId ===
    payload.assignedToId;

  const isCreator =
    task.project.creatorId ===
    payload.assignedToId;

  if (
    !isProjectMember &&
    !isManager &&
    !isCreator
  ) {
    throw new AppError(
      400,
      "Task can only be assigned to a project member"
    );
  }

  const updatedTask =
    await prisma.$transaction(
      async (tx) => {
        const result =
          await tx.task.update({
            where: {
              id: taskId,
            },

            data: {
              assignedToId:
                payload.assignedToId,
            },

            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
              projectId: true,
              assignedToId: true,

              assignedTo: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
            },
          });

        await tx.auditLog.create({
          data: {
            userId,
            action: "TASK_ASSIGNED",
            entity: "TASK",
            entityId: taskId,
            oldData:
              task as unknown as Prisma.InputJsonValue,
            newData:
              result as unknown as Prisma.InputJsonValue,
          },
        });

        return result;
      }
    );

  return updatedTask;
};

const changeTaskStatus = async (
  userId: string,
  userRole: Role,
  taskId: string,
  payload: IChangeTaskStatusPayload
) => {
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      isDeleted: false,
    },

    select: {
      id: true,
      title: true,
      status: true,
      assignedToId: true,
      projectId: true,

      project: {
        select: {
          managerId: true,
          creatorId: true,
        },
      },
    },
  });

  if (!task) {
    throw new AppError(404, "Task not found");
  }

  const newStatus =
    payload.status as TaskStatus;

  const isAdmin =
    userRole === Role.ADMIN;

  const isManager =
    task.project.managerId === userId;

  const isCreator =
    task.project.creatorId === userId;

  const isAssignee =
    task.assignedToId === userId;

  if (
    !isAdmin &&
    !isManager &&
    !isCreator &&
    !isAssignee
  ) {
    throw new AppError(
      403,
      "You do not have permission to change this task status"
    );
  }

  const allowedTransitions: Record<
    TaskStatus,
    TaskStatus[]
  > = {
    TODO: [
      TaskStatus.IN_PROGRESS,
      TaskStatus.CANCELLED,
    ],

    IN_PROGRESS: [
      TaskStatus.TODO,
      TaskStatus.COMPLETED,
      TaskStatus.CANCELLED,
    ],

    COMPLETED: [],

    CANCELLED: [
      TaskStatus.TODO,
    ],
  };

  if (
    task.status !== newStatus &&
    !allowedTransitions[
      task.status
    ].includes(newStatus)
  ) {
    throw new AppError(
      400,
      `Cannot change task status from ${task.status} to ${newStatus}`
    );
  }

  if (task.status === newStatus) {
    throw new AppError(
      400,
      "Task is already in this status"
    );
  }

  const updatedTask =
    await prisma.$transaction(
      async (tx) => {
        const result =
          await tx.task.update({
            where: {
              id: taskId,
            },

            data: {
              status: newStatus,
            },

            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
              projectId: true,
              assignedToId: true,
              updatedAt: true,
            },
          });

        await tx.auditLog.create({
          data: {
            userId,
            action: "TASK_STATUS_CHANGED",
            entity: "TASK",
            entityId: taskId,
            oldData:
              task as unknown as Prisma.InputJsonValue,
            newData:
              result as unknown as Prisma.InputJsonValue,
          },
        });

        return result;
      }
    );

  return updatedTask;
};

const getMyTasks = async (
  userId: string,
  query: ITaskQuery
) => {
  const page = Math.max(
    Number(query.page) || 1,
    1
  );

  const limit = Math.min(
    Math.max(Number(query.limit) || 10, 1),
    100
  );

  const skip = (page - 1) * limit;

  const status = query.status as
    | TaskStatus
    | undefined;

  const priority = query.priority as
    | TaskPriority
    | undefined;

  const where: Prisma.TaskWhereInput = {
    isDeleted: false,

    assignedToId: userId,

    ...(status && {
      status,
    }),

    ...(priority && {
      priority,
    }),
  };

  const sortBy = query.sortBy ?? "createdAt";

  const sortOrder =
    query.sortOrder === "asc"
      ? "asc"
      : "desc";

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,

      skip,
      take: limit,

      orderBy: {
        [sortBy]: sortOrder,
      },

      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        projectId: true,
        assignedToId: true,
        dueDate: true,
        createdAt: true,
        updatedAt: true,

        project: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    }),

    prisma.task.count({
      where,
    }),
  ]);

  return {
    tasks,

    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(
        total / limit
      ),
    },
  };
};

export const taskService = {
  createTask,
  getTasks,
  getSingleTask,
  updateTask,
  deleteTask,
  assignTask,
  changeTaskStatus,
  getMyTasks,
};