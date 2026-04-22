import { describe, expect, it } from "vitest";
import {
  buildFocusBuckets,
  buildTaskBuckets,
  buildTaskSummary,
  getPriorityLabel,
  getStatusLabel,
  getTaskListLabel,
  getViewDescription,
  sortTasksByRecentActivity
} from "./task.selectors";
import {
  describeTaskMoment,
  describeTaskPriority,
  describeTaskStatus,
  formatTaskCode
} from "./task.formatters";
import type { Task } from "./task.types";

function makeTask(
  id: string,
  title: string,
  status: Task["status"],
  createdAt: string,
  priority: Task["priority"] = "medium",
  updatedAt = createdAt
): Task {
  return {
    id,
    title,
    description: null,
    priority,
    status,
    createdAt,
    updatedAt,
    archivedAt: status === "archived" ? updatedAt : null
  };
}

describe("task-board helpers", () => {
  it("builds summary counts and labels", () => {
    const tasks = [
      makeTask("1", "Triar paciente", "pending", "2026-04-20T08:00:00Z", "high"),
      makeTask("2", "Fechar atendimento", "completed", "2026-04-20T09:00:00Z")
    ];

    expect(buildTaskSummary(tasks)).toEqual({
      total: 2,
      pending: 1,
      inProgress: 0,
      completed: 1,
      cancelled: 0,
      highPriority: 1
    });
    expect(getTaskListLabel("all")).toBe("Todas as tarefas ativas");
    expect(getTaskListLabel("archived")).toBe("Tarefas arquivadas");
    expect(getViewDescription("kanban")).toContain("Colunas");
    expect(getPriorityLabel("high")).toBe("Alta");
    expect(getStatusLabel("archived")).toBe("Arquivada");
    expect(formatTaskCode("a1b2-c3d4")).toBe("TB-B2C3D4");
    expect(formatTaskCode("---")).toBe("TB-TASK");
  });

  it("builds buckets by active status", () => {
    const tasks = [
      makeTask("1", "Task A", "pending", "2026-04-20T08:00:00Z"),
      makeTask("2", "Task B", "in_progress", "2026-04-20T09:00:00Z"),
      makeTask("3", "Task C", "completed", "2026-04-20T10:00:00Z"),
      makeTask("4", "Task D", "cancelled", "2026-04-20T11:00:00Z")
    ];

    expect(buildTaskBuckets(tasks).map((bucket) => bucket.status)).toEqual([
      "pending",
      "in_progress",
      "completed",
      "cancelled"
    ]);
    expect(buildFocusBuckets(tasks).active.map((task) => task.status)).toEqual([
      "in_progress",
      "pending"
    ]);
  });

  it("sorts tasks by priority and recent activity and describes timestamps", () => {
    const older = makeTask(
      "1",
      "Older",
      "pending",
      "2026-04-20T08:00:00Z",
      "medium",
      "2026-04-20T08:00:00Z"
    );
    const newerHigh = makeTask(
      "2",
      "Newer",
      "completed",
      "2026-04-20T09:00:00Z",
      "high",
      "2026-04-20T11:30:00Z"
    );
    const archived = makeTask(
      "3",
      "Archived",
      "archived",
      "2026-04-20T07:00:00Z",
      "low",
      "2026-04-20T12:00:00Z"
    );

    expect(sortTasksByRecentActivity([older, newerHigh]).map((task) => task.id)).toEqual([
      "2",
      "1"
    ]);
    expect(describeTaskMoment(older)).toContain("Criada em");
    expect(describeTaskMoment(newerHigh)).toContain("Concluída em");
    expect(describeTaskMoment(archived)).toContain("Arquivada em");
    expect(describeTaskStatus(newerHigh)).toBe("Concluída");
    expect(describeTaskPriority(newerHigh)).toBe("Alta");
  });

  it("falls back to createdAt and then to title ordering when recent activity ties", () => {
    const newerCreated = makeTask(
      "1",
      "Zulu",
      "pending",
      "2026-04-20T10:00:00Z",
      "medium",
      "2026-04-20T12:00:00Z"
    );
    const olderCreated = makeTask(
      "2",
      "Alpha",
      "pending",
      "2026-04-20T09:00:00Z",
      "medium",
      "2026-04-20T12:00:00Z"
    );
    const sameDatesA = makeTask(
      "3",
      "Árvore",
      "pending",
      "2026-04-20T10:00:00Z",
      "medium",
      "2026-04-20T12:00:00Z"
    );
    const sameDatesB = makeTask(
      "4",
      "Bola",
      "pending",
      "2026-04-20T10:00:00Z",
      "medium",
      "2026-04-20T12:00:00Z"
    );

    expect(sortTasksByRecentActivity([olderCreated, newerCreated]).map((task) => task.id)).toEqual([
      "1",
      "2"
    ]);
    expect(sortTasksByRecentActivity([sameDatesB, sameDatesA]).map((task) => task.title)).toEqual([
      "Árvore",
      "Bola"
    ]);
  });
});
