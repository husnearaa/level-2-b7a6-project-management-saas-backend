import { z } from "zod";

export const updateProfileSchema = z.object({
  body: z
    .object({
      name: z.string().min(2).max(100).optional(),
      email: z.string().email().optional(),
    })
    .refine(
      (data) => data.name !== undefined || data.email !== undefined,
      {
        message: "At least one field is required",
      }
    ),
});

export const changePasswordSchema = z.object({
  body: z
    .object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8).max(100),
    })
    .refine(
      (data) => data.currentPassword !== data.newPassword,
      {
        message:
          "New password must be different from current password",
        path: ["newPassword"],
      }
    ),
});

export const getMyProjectsSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    status: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
});