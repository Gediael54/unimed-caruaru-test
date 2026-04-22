export type TaskPriority = "low" | "medium" | "high";
export type TaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "archived";
export type ActiveTaskStatus = Exclude<TaskStatus, "archived">;
export type TaskFilter = TaskStatus | "all";
export type TaskViewMode = "list" | "kanban" | "timeline" | "focus";

export type Task = {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type CreateTaskInput = {
  title: string;
  description: string;
  priority: TaskPriority;
};

export type UpdateTaskInput = {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
};

export type TaskSummary = {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  highPriority: number;
};

export type TaskBucket = {
  status: ActiveTaskStatus;
  label: string;
  accent: string;
  description: string;
  emptyCopy: string;
  tasks: Task[];
};
