import { z } from "zod";

export const getAdminUsersSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),

    search: z.string().optional(),

    role: z
      .enum(["ADMIN", "MANAGER", "MEMBER"])
      .optional(),

    status: z
      .enum(["ACTIVE", "INACTIVE", "BLOCKED"])
      .optional(),

    sortBy: z
      .enum(["createdAt", "name", "email"])
      .optional(),

    sortOrder: z
      .enum(["asc", "desc"])
      .optional(),
  }),
});

export const updateUserRoleSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),

  body: z.object({
    role: z.enum(["ADMIN", "MANAGER", "MEMBER"]),
  }),
});

export const updateUserStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),

  body: z.object({
    status: z.enum([
      "ACTIVE",
      "INACTIVE",
      "BLOCKED",
    ]),
  }),
});