export interface ICreateProjectPayload {
  name: string;
  description?: string;
  managerId: string;
  deadline?: string;
}

export interface IUpdateProjectPayload {
  name?: string;
  description?: string;
  status?: string;
  managerId?: string;
  deadline?: string | null;
}

export interface IAddProjectMemberPayload {
  userId: string;
}

export interface IProjectQuery {
  page?: string;
  limit?: string;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}