import { request } from "../../../shared/lib/http";
import type {
  CreateTaskInput,
  Task,
  TaskFilter,
  UpdateTaskInput
} from "../model/task.types";

export function listTasks(status: TaskFilter): Promise<Task[]> {
  const query = status === "all" ? "" : `?status=${status}`;
  return request<Task[]>(`/tasks${query}`);
}

export function createTask(input: CreateTaskInput): Promise<Task> {
  return request<Task>("/tasks", {
    method: "POST",
    body: JSON.stringify({
      title: input.title,
      description: input.description || null,
      priority: input.priority
    })
  });
}

export function updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
  return request<Task>(`/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export function archiveTask(id: string): Promise<void> {
  return request<void>(`/tasks/${id}`, {
    method: "DELETE"
  });
}
