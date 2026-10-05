import { z } from "zod";

const taskStatuses = [
  "TODO",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;

const taskPriorities = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
] as const;

export const createTaskSchema = z.object({
  body: z.object({
    title: z.string().min(2).max(200),

    description: z
      .string()
      .max(2000)
      .optional(),

    projectId: z.string().uuid(),

    assignedToId: z
      .string()
      .uuid()
      .optional(),

    priority: z
      .enum(taskPriorities)
      .optional(),

    dueDate: z
      .string()
      .datetime()
      .optional(),
  }),
});

export const getTasksSchema = z.object({
  query: z.object({
    page: z.string().optional(),

    limit: z.string().optional(),

    search: z
      .string()
      .optional(),

    projectId: z
      .string()
      .uuid()
      .optional(),

    assignedToId: z
      .string()
      .uuid()
      .optional(),

    status: z
      .enum(taskStatuses)
      .optional(),

    priority: z
      .enum(taskPriorities)
      .optional(),

    sortBy: z
      .enum([
        "title",
        "createdAt",
        "updatedAt",
        "dueDate",
        "priority",
        "status",
      ])
      .optional(),

    sortOrder: z
      .enum(["asc", "desc"])
      .optional(),
  }),
});

export const taskIdSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const updateTaskSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),

  body: z
    .object({
      title: z
        .string()
        .min(2)
        .max(200)
        .optional(),

      description: z
        .string()
        .max(2000)
        .optional(),

      priority: z
        .enum(taskPriorities)
        .optional(),

      assignedToId: z
        .string()
        .uuid()
        .nullable()
        .optional(),

      dueDate: z
        .string()
        .datetime()
        .nullable()
        .optional(),
    })
    .refine(
      (data) => Object.keys(data).length > 0,
      {
        message: "At least one field is required",
      }
    ),
});

export const assignTaskSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),

  body: z.object({
    assignedToId: z.string().uuid(),
  }),
});

export const changeTaskStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),

  body: z.object({
    status: z.enum(taskStatuses),
  }),
});

export const myTasksSchema = z.object({
  query: z.object({
    page: z.string().optional(),

    limit: z.string().optional(),

    status: z
      .enum(taskStatuses)
      .optional(),

    priority: z
      .enum(taskPriorities)
      .optional(),

    sortBy: z
      .enum([
        "title",
        "createdAt",
        "updatedAt",
        "dueDate",
        "priority",
        "status",
      ])
      .optional(),

    sortOrder: z
      .enum(["asc", "desc"])
      .optional(),
  }),
});