import type { Prisma } from "../../../prisma/generated/prisma/client";
import type {
  AuditAction,
  AuditEntity,
} from "../../../prisma/generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import type { IAuditLogQuery } from "./audit.interface";

const getAuditLogs = async (query: IAuditLogQuery) => {
  const page = Math.max(Number(query.page) || 1, 1);

  const limit = Math.min(
    Math.max(Number(query.limit) || 10, 1),
    100,
  );

  const skip = (page - 1) * limit;

  const where: Prisma.AuditLogWhereInput = {};

  if (query.action) {
    where.action = query.action as AuditAction;
  }

  if (query.entity) {
    where.entity = query.entity as AuditEntity;
  }

  if (query.userId) {
    where.userId = query.userId;
  }

  const sortOrder = query.sortOrder || "desc";

  const [logs, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,

      skip,

      take: limit,

      orderBy: {
        createdAt: sortOrder,
      },

      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        oldData: true,
        newData: true,
        ipAddress: true,
        createdAt: true,

        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    }),

    prisma.auditLog.count({
      where,
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data: logs,

    meta: {
      page,
      limit,
      total,
      totalPages,
    },
  };
};

export const auditService = {
  getAuditLogs,
};