export interface ICreateTaskPayload {
  title: string;
  description?: string;
  projectId: string;
  assignedToId?: string;
  priority?: string;
  dueDate?: string;
}

export interface IUpdateTaskPayload {
  title?: string;
  description?: string;
  priority?: string;
  assignedToId?: string | null;
  dueDate?: string | null;
}

export interface IAssignTaskPayload {
  assignedToId: string;
}

export interface IChangeTaskStatusPayload {
  status: string;
}

export interface ITaskQuery {
  page?: string;
  limit?: string;
  search?: string;
  projectId?: string;
  assignedToId?: string;
  status?: string;
  priority?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}