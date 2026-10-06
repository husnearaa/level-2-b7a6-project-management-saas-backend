import type {
  Role,
  UserStatus,
} from "../../../prisma/generated/prisma/enums";

export interface IAdminUserQuery {
  page?: string;
  limit?: string;
  search?: string;
  role?: Role;
  status?: UserStatus;
  sortBy?: "createdAt" | "name" | "email";
  sortOrder?: "asc" | "desc";
}

export interface IUpdateUserRolePayload {
  role: Role;
}

export interface IUpdateUserStatusPayload {
  status: UserStatus;
}