import { z } from "zod";

const projectStatuses = [
  "PLANNING",
  "ACTIVE",
  "COMPLETED",
  "ARCHIVED",
] as const;

export const createProjectSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(150),
    description: z.string().max(1000).optional(),
    managerId: z.string().uuid(),
    deadline: z.string().datetime().optional(),
  }),
});

export const updateProjectSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z
    .object({
      name: z.string().min(2).max(150).optional(),
      description: z.string().max(1000).optional(),
      status: z.enum(projectStatuses).optional(),
      managerId: z.string().uuid().optional(),
      deadline: z.string().datetime().nullable().optional(),
    })
    .refine(
      (data) => Object.keys(data).length > 0,
      {
        message: "At least one field is required",
      }
    ),
});

export const projectIdSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const getProjectsSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    status: z.enum(projectStatuses).optional(),
    sortBy: z
      .enum(["name", "createdAt", "updatedAt", "deadline"])
      .optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
});

export const addProjectMemberSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    userId: z.string().uuid(),
  }),
});

export const removeProjectMemberSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
  }),
});