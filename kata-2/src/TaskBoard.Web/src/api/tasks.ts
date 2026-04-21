import { request } from "./http";
import type { Task, TaskStatus } from "../types";

export function listTasks(status: TaskStatus | "all"): Promise<Task[]> {
  const query = status === "all" ? "" : `?status=${status}`;
  return request<Task[]>(`/tasks${query}`);
}

export function createTask(title: string): Promise<Task> {
  return request<Task>("/tasks", {
    method: "POST",
    body: JSON.stringify({ title })
  });
}

export function completeTask(id: string): Promise<Task> {
  return request<Task>(`/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "completed" })
  });
}

export function deleteTask(id: string): Promise<void> {
  return request<void>(`/tasks/${id}`, {
    method: "DELETE"
  });
}
