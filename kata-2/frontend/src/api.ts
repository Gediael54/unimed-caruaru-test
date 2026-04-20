import type { Task, TaskStatus } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers
    },
    ...options
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}.`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) {
        message = body.error;
      }
    } catch {
      // Keep the status-based message when the body is empty or not JSON.
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

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
