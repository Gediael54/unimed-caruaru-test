import { PRIORITY_LABELS, STATUS_LABELS } from "./task.constants";
import type { Task } from "./task.types";

type DueDateTone = "neutral" | "on_track" | "soon" | "overdue";

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

function normalizeToUtcDay(date: Date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function parseFlexibleDueDate(value: string): Date | null {
  const brazilianMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brazilianMatch) {
    const [, day, month, year] = brazilianMatch;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }

  const isoDateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDateMatch) {
    const [, year, month, day] = isoDateMatch;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }

  const fallback = new Date(value);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export function describeDueDateSignal(
  value: string | null,
  referenceDate = new Date()
): { label: string; tone: DueDateTone } {
  if (!value) {
    return { label: "Sem prazo", tone: "neutral" };
  }

  const dueDate = parseFlexibleDueDate(value);
  if (!dueDate) {
    return { label: "Prazo informado", tone: "neutral" };
  }

  const diffDays = Math.round(
    (normalizeToUtcDay(dueDate) - normalizeToUtcDay(referenceDate)) / 86_400_000
  );

  if (diffDays < 0) {
    return { label: "Atrasado", tone: "overdue" };
  }

  if (diffDays === 0) {
    return { label: "Vence hoje", tone: "soon" };
  }

  if (diffDays <= 2) {
    return { label: "Vence em breve", tone: "soon" };
  }

  return { label: "No prazo", tone: "on_track" };
}
