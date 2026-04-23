import { parseTaskDescription, type ParsedChecklistItem } from "./task.description";
import type { Task, TaskPriority } from "./task.types";

export type TaskEditorValues = {
  assignees: string;
  checklist: string;
  dueDate: string;
  labels: string;
  priority: TaskPriority;
  summary: string;
  title: string;
};

function splitCommaSeparated(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitMultiline(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseChecklistLine(value: string): ParsedChecklistItem {
  const normalized = value.trim().replace(/^[-*]\s+/, "");
  const markedMatch = normalized.match(/^\[(x| )\]\s*(.+)$/i);

  if (markedMatch) {
    return {
      done: markedMatch[1].toLowerCase() === "x",
      text: markedMatch[2].trim()
    };
  }

  return {
    done: false,
    text: normalized
  };
}

function formatChecklistLines(items: ParsedChecklistItem[]) {
  return items
    .map((item) => `${item.done ? "[x]" : "[ ]"} ${item.text}`.trim())
    .join("\n");
}

function toDateInputValue(value: string | null) {
  if (!value) {
    return "";
  }

  const brazilianMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brazilianMatch) {
    const [, day, month, year] = brazilianMatch;
    return `${year}-${month}-${day}`;
  }

  const isoDateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDateMatch) {
    return value;
  }

  return "";
}

function fromDateInputValue(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return "";
  }

  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return normalized;
  }

  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

export function createTaskEditorValues(task?: Task | null): TaskEditorValues {
  const description = parseTaskDescription(task?.description ?? null);

  return {
    assignees: description.assignees.join(", "),
    checklist: formatChecklistLines(description.checklistItems),
    dueDate: toDateInputValue(description.dueDate),
    labels: description.labels.join(", "),
    priority: task?.priority ?? "medium",
    summary: description.summary ?? "",
    title: task?.title ?? ""
  };
}

export function buildTaskDescription(values: TaskEditorValues) {
  const lines: string[] = [];

  if (values.summary.trim()) {
    lines.push(values.summary.trim());
  }

  const assignees = splitCommaSeparated(values.assignees);
  if (assignees.length > 0) {
    lines.push(`Responsável: ${assignees.join(", ")}`);
  }

  const dueDate = fromDateInputValue(values.dueDate);
  if (dueDate) {
    lines.push(`Prazo: ${dueDate}`);
  }

  const labels = splitCommaSeparated(values.labels);
  if (labels.length > 0) {
    lines.push(`Labels: ${labels.join(", ")}`);
  }

  const checklistItems = splitMultiline(values.checklist).map(parseChecklistLine);
  if (checklistItems.length > 0) {
    lines.push("Checklist:");
    lines.push(
      ...checklistItems.map((item) =>
        item.done ? `- [x] ${item.text}` : `- ${item.text}`
      )
    );
  }

  return lines.join("\n").trim();
}
