import {
  FILTER_LABELS,
  PRIORITY_LABELS,
  STATUS_ACCENTS,
  STATUS_DESCRIPTIONS,
  STATUS_EMPTY_COPY,
  STATUS_LABELS,
  VIEW_DESCRIPTIONS,
  activeTaskStatuses
} from "./task.constants";
import type {
  ActiveTaskStatus,
  Task,
  TaskBucket,
  TaskFilter,
  TaskPriority,
  TaskSummary,
  TaskViewMode
} from "./task.types";

const priorityWeights: Record<TaskPriority, number> = {
  high: 3,
  medium: 2,
  low: 1
};

export function buildTaskSummary(tasks: Task[]): TaskSummary {
  return {
    total: tasks.length,
    pending: tasks.filter((task) => task.status === "pending").length,
    inProgress: tasks.filter((task) => task.status === "in_progress").length,
    completed: tasks.filter((task) => task.status === "completed").length,
    cancelled: tasks.filter((task) => task.status === "cancelled").length,
    highPriority: tasks.filter((task) => task.priority === "high").length
  };
}

export function getTaskListLabel(filter: TaskFilter): string {
  return FILTER_LABELS[filter];
}

export function getViewDescription(viewMode: TaskViewMode): string {
  return VIEW_DESCRIPTIONS[viewMode];
}

export function getPriorityLabel(priority: TaskPriority): string {
  return PRIORITY_LABELS[priority];
}

export function buildTaskBuckets(tasks: Task[]): TaskBucket[] {
  return activeTaskStatuses.map((status) => ({
    status,
    label: STATUS_LABELS[status],
    accent: STATUS_ACCENTS[status],
    description: STATUS_DESCRIPTIONS[status],
    emptyCopy: STATUS_EMPTY_COPY[status],
    tasks: tasks.filter((task) => task.status === status)
  }));
}

export function buildFocusBuckets(tasks: Task[]) {
  const sorted = sortTasksByRecentActivity(tasks);

  return {
    active: sorted.filter(
      (task) => task.status === "pending" || task.status === "in_progress"
    ),
    closed: sorted.filter(
      (task) => task.status === "completed" || task.status === "cancelled"
    )
  };
}

export function sortTasksByRecentActivity(tasks: Task[]): Task[] {
  return [...tasks].sort((left, right) => {
    const priorityDelta = priorityWeights[right.priority] - priorityWeights[left.priority];
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    const leftTime = Date.parse(left.updatedAt);
    const rightTime = Date.parse(right.updatedAt);
    if (leftTime !== rightTime) {
      return rightTime - leftTime;
    }

    const leftCreated = Date.parse(left.createdAt);
    const rightCreated = Date.parse(right.createdAt);
    if (leftCreated !== rightCreated) {
      return rightCreated - leftCreated;
    }

    return left.title.localeCompare(right.title, "pt-BR");
  });
}

export function getStatusLabel(status: ActiveTaskStatus | "archived"): string {
  return STATUS_LABELS[status];
}
