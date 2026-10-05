import {
  ProjectStatus,
  Role,
} from "../../../prisma/generated/prisma/enums";
import { Prisma } from "../../../prisma/generated/prisma/client";

import { prisma } from "../../lib/prisma";
import AppError from "../../utils/appError";

import type {
  IAddProjectMemberPayload,
  ICreateProjectPayload,
  IProjectQuery,
  IUpdateProjectPayload,
} from "./project.interface";

const createProject = async (
  userId: string,
  userRole: Role,
  payload: ICreateProjectPayload
) => {
  if (userRole !== Role.ADMIN && userRole !== Role.MANAGER) {
    throw new AppError(
      403,
      "Only admin or manager can create a project"
    );
  }

  const manager = await prisma.user.findFirst({
    where: {
      id: payload.managerId,
      isDeleted: false,
      status: "ACTIVE",
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!manager) {
    throw new AppError(404, "Manager not found");
  }

  if (
    manager.role !== Role.MANAGER &&
    manager.role !== Role.ADMIN
  ) {
    throw new AppError(
      400,
      "Selected user cannot manage a project"
    );
  }

  const project = await prisma.$transaction(
    async (tx) => {
      const newProject = await tx.project.create({
        data: {
          name: payload.name,

          ...(payload.description !== undefined && {
            description: payload.description,
          }),

          managerId: payload.managerId,
          creatorId: userId,

          ...(payload.deadline !== undefined && {
            deadline: new Date(payload.deadline),
          }),
        },

        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          managerId: true,
          creatorId: true,
          deadline: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: "PROJECT_CREATED",
          entity: "PROJECT",
          entityId: newProject.id,
          newData: newProject as unknown as Prisma.InputJsonValue,
        },
      });

      return newProject;
    }
  );

  return project;
};

const getProjects = async (
  userId: string,
  userRole: Role,
  query: IProjectQuery
) => {
  const page = Math.max(Number(query.page) || 1, 1);

  const limit = Math.min(
    Math.max(Number(query.limit) || 10, 1),
    100
  );

  const skip = (page - 1) * limit;

  const search = query.search?.trim();

  const status = query.status as
    | ProjectStatus
    | undefined;

  const baseWhere: Prisma.ProjectWhereInput = {
    isDeleted: false,

    ...(status && {
      status,
    }),

    ...(search && {
      OR: [
        {
          name: {
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
  };

  const where: Prisma.ProjectWhereInput =
    userRole === Role.ADMIN
      ? baseWhere
      : {
          ...baseWhere,
          AND: [
            {
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
          ],
        };

  const sortBy = query.sortBy ?? "createdAt";

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

const getSingleProject = async (
  userId: string,
  userRole: Role,
  projectId: string
) => {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      isDeleted: false,

      ...(userRole !== Role.ADMIN && {
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
      }),
    },

    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      managerId: true,
      creatorId: true,
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

      members: {
        select: {
          id: true,
          joinedAt: true,

          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      },

      _count: {
        select: {
          members: true,
          tasks: true,
        },
      },
    },
  });

  if (!project) {
    throw new AppError(
      404,
      "Project not found or you do not have access"
    );
  }

  return project;
};

const updateProject = async (
  userId: string,
  userRole: Role,
  projectId: string,
  payload: IUpdateProjectPayload
) => {
  const existingProject =
    await prisma.project.findFirst({
      where: {
        id: projectId,
        isDeleted: false,
      },
    });

  if (!existingProject) {
    throw new AppError(404, "Project not found");
  }

  const canUpdate =
    userRole === Role.ADMIN ||
    existingProject.managerId === userId ||
    existingProject.creatorId === userId;

  if (!canUpdate) {
    throw new AppError(
      403,
      "You do not have permission to update this project"
    );
  }

  if (payload.managerId) {
    const manager = await prisma.user.findFirst({
      where: {
        id: payload.managerId,
        isDeleted: false,
        status: "ACTIVE",
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!manager) {
      throw new AppError(404, "Manager not found");
    }

    if (
      manager.role !== Role.MANAGER &&
      manager.role !== Role.ADMIN
    ) {
      throw new AppError(
        400,
        "Selected user cannot manage a project"
      );
    }
  }

  const updatedProject =
    await prisma.$transaction(
      async (tx) => {
        const project = await tx.project.update({
          where: {
            id: projectId,
          },

          data: {
            ...(payload.name !== undefined && {
              name: payload.name,
            }),

            ...(payload.description !== undefined && {
              description: payload.description,
            }),

            ...(payload.status !== undefined && {
              status: payload.status as ProjectStatus,
            }),

            ...(payload.managerId !== undefined && {
              managerId: payload.managerId,
            }),

            ...(payload.deadline !== undefined && {
              deadline: payload.deadline
                ? new Date(payload.deadline)
                : null,
            }),
          },

          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            managerId: true,
            creatorId: true,
            deadline: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        await tx.auditLog.create({
          data: {
            userId,
            action: "PROJECT_UPDATED",
            entity: "PROJECT",
            entityId: projectId,
            oldData:
              existingProject as unknown as Prisma.InputJsonValue,
            newData:
              project as unknown as Prisma.InputJsonValue,
          },
        });

        return project;
      }
    );

  return updatedProject;
};

const deleteProject = async (
  userId: string,
  userRole: Role,
  projectId: string
) => {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      isDeleted: false,
    },
  });

  if (!project) {
    throw new AppError(404, "Project not found");
  }

  const canDelete =
    userRole === Role.ADMIN ||
    project.managerId === userId ||
    project.creatorId === userId;

  if (!canDelete) {
    throw new AppError(
      403,
      "You do not have permission to delete this project"
    );
  }

  await prisma.$transaction(
    async (tx) => {
      await tx.project.update({
        where: {
          id: projectId,
        },

        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: "PROJECT_DELETED",
          entity: "PROJECT",
          entityId: projectId,
          oldData:
            project as unknown as Prisma.InputJsonValue,
        },
      });
    }
  );

  return null;
};

const addMember = async (
  userId: string,
  userRole: Role,
  projectId: string,
  payload: IAddProjectMemberPayload
) => {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      isDeleted: false,
    },
  });

  if (!project) {
    throw new AppError(404, "Project not found");
  }

  const canManageMembers =
    userRole === Role.ADMIN ||
    project.managerId === userId ||
    project.creatorId === userId;

  if (!canManageMembers) {
    throw new AppError(
      403,
      "You do not have permission to manage project members"
    );
  }

  const member = await prisma.user.findFirst({
    where: {
      id: payload.userId,
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

  if (!member) {
    throw new AppError(404, "User not found");
  }

  const existingMember =
    await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: payload.userId,
        },
      },
    });

  if (existingMember) {
    throw new AppError(
      409,
      "User is already a project member"
    );
  }

  const projectMember =
    await prisma.$transaction(
      async (tx) => {
        const newMember =
          await tx.projectMember.create({
            data: {
              projectId,
              userId: payload.userId,
            },

            select: {
              id: true,
              projectId: true,
              userId: true,
              joinedAt: true,

              user: {
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
            action: "MEMBER_ADDED",
            entity: "PROJECT_MEMBER",
            entityId: newMember.id,
            newData:
              newMember as unknown as Prisma.InputJsonValue,
          },
        });

        return newMember;
      }
    );

  return projectMember;
};

const removeMember = async (
  userId: string,
  userRole: Role,
  projectId: string,
  memberId: string
) => {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      isDeleted: false,
    },
  });

  if (!project) {
    throw new AppError(404, "Project not found");
  }

  const canManageMembers =
    userRole === Role.ADMIN ||
    project.managerId === userId ||
    project.creatorId === userId;

  if (!canManageMembers) {
    throw new AppError(
      403,
      "You do not have permission to manage project members"
    );
  }

  const member =
    await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: memberId,
        },
      },
    });

  if (!member) {
    throw new AppError(
      404,
      "Project member not found"
    );
  }

  await prisma.$transaction(
    async (tx) => {
      await tx.projectMember.delete({
        where: {
          id: member.id,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: "MEMBER_REMOVED",
          entity: "PROJECT_MEMBER",
          entityId: member.id,
          oldData:
            member as unknown as Prisma.InputJsonValue,
        },
      });
    }
  );

  return null;
};

export const projectService = {
  createProject,
  getProjects,
  getSingleProject,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
};