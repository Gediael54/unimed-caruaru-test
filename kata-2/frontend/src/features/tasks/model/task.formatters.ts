import { PRIORITY_LABELS, STATUS_LABELS } from "./task.constants";
import type { Task } from "./task.types";

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short"
});

export function describeTaskMoment(task: Task): string {
  if (task.status === "archived" && task.archivedAt) {
    return `Arquivada em ${dateTimeFormatter.format(new Date(task.archivedAt))}`;
  }

  if (task.status === "completed") {
    return `Concluída em ${dateTimeFormatter.format(new Date(task.updatedAt))}`;
  }

  if (task.status === "cancelled") {
    return `Cancelada em ${dateTimeFormatter.format(new Date(task.updatedAt))}`;
  }

  if (task.status === "in_progress") {
    return `Em andamento desde ${dateTimeFormatter.format(new Date(task.updatedAt))}`;
  }

  return `Criada em ${dateTimeFormatter.format(new Date(task.createdAt))}`;
}

export function describeTaskStatus(task: Task): string {
  return STATUS_LABELS[task.status];
}

export function describeTaskPriority(task: Task): string {
  return PRIORITY_LABELS[task.priority];
}

export function formatTaskCode(id: string): string {
  const compact = id.replace(/-/g, "").slice(-6).toUpperCase();
  return `TB-${compact || "TASK"}`;
}
