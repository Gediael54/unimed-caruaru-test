import { describe, expect, it } from "vitest";
import {
  buildFocusBuckets,
  buildTaskBuckets,
  buildTaskSummary,
  filterTasksByQuery,
  getPriorityLabel,
  getStatusLabel,
  getTaskListLabel,
  getViewDescription,
  sortTasks,
  sortTasksByRecentActivity
} from "./task.selectors";
import {
  describeDueDateSignal,
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
      "pending",
      "in_progress"
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

    const samePriorityOlder = makeTask(
      "4",
      "Same priority older",
      "pending",
      "2026-04-20T08:00:00Z",
      "medium",
      "2026-04-20T08:30:00Z"
    );
    const samePriorityNewer = makeTask(
      "5",
      "Same priority newer",
      "pending",
      "2026-04-20T09:00:00Z",
      "medium",
      "2026-04-20T12:30:00Z"
    );

    expect(
      sortTasksByRecentActivity([samePriorityOlder, samePriorityNewer]).map((task) => task.id)
    ).toEqual(["5", "4"]);
  });

  it("describes due date state for overdue, near and safe deadlines", () => {
    const reference = new Date("2026-04-22T12:00:00Z");

    expect(describeDueDateSignal("2026-04-20", reference)).toEqual({
      label: "Atrasado",
      tone: "overdue"
    });
    expect(describeDueDateSignal("22/04/2026", reference)).toEqual({
      label: "Vence hoje",
      tone: "soon"
    });
    expect(describeDueDateSignal("2026-04-24", reference)).toEqual({
      label: "Vence em breve",
      tone: "soon"
    });
    expect(describeDueDateSignal("2026-04-30", reference)).toEqual({
      label: "No prazo",
      tone: "on_track"
    });
    expect(describeDueDateSignal("2026-04-22T15:30:00Z", reference)).toEqual({
      label: "Vence hoje",
      tone: "soon"
    });
    expect(describeDueDateSignal("sem data", reference)).toEqual({
      label: "Prazo informado",
      tone: "neutral"
    });
    expect(describeDueDateSignal(null, reference)).toEqual({
      label: "Sem prazo",
      tone: "neutral"
    });
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

  it("sorts tasks by the selected mode", () => {
    const alpha = {
      ...makeTask("1", "Alpha", "pending", "2026-04-20T08:00:00Z", "medium", "2026-04-20T11:00:00Z"),
      description: "Responsável: Ana"
    };
    const beta = {
      ...makeTask("2", "Beta", "pending", "2026-04-20T10:00:00Z", "low", "2026-04-20T09:00:00Z"),
      description: "Labels: ops"
    };
    const gamma = {
      ...makeTask("3", "Gamma", "pending", "2026-04-20T09:00:00Z", "high", "2026-04-20T12:00:00Z"),
      description: "Checklist:\n- Review flow"
    };

    expect(sortTasks([alpha, beta, gamma], "priority").map((task) => task.id)).toEqual([
      "3",
      "1",
      "2"
    ]);
    expect(sortTasks([alpha, beta, gamma], "recent").map((task) => task.id)).toEqual([
      "3",
      "1",
      "2"
    ]);
    expect(sortTasks([alpha, beta, gamma], "created").map((task) => task.id)).toEqual([
      "2",
      "3",
      "1"
    ]);
    expect(sortTasks([alpha, beta, gamma], "title").map((task) => task.title)).toEqual([
      "Alpha",
      "Beta",
      "Gamma"
    ]);
  });

  it("filters tasks by title, summary and structured metadata", () => {
    const tasks: Task[] = [
      {
        ...makeTask("1", "Review board flow", "pending", "2026-04-20T08:00:00Z"),
        description: [
          "Structured summary",
          "Responsável: Ana",
          "Prazo: 25/04/2026",
          "Labels: ux, board",
          "Checklist:",
          "- Review drag and drop"
        ].join("\n")
      },
      {
        ...makeTask("2", "Update indicators", "completed", "2026-04-20T09:00:00Z"),
        description: "Resumo operacional"
      },
      {
        ...makeTask("3", "Archive follow-up", "cancelled", "2026-04-20T10:00:00Z"),
        description: null
      }
    ];

    expect(filterTasksByQuery(tasks, "").map((task) => task.id)).toEqual(["1", "2", "3"]);
    expect(filterTasksByQuery(tasks, "review board").map((task) => task.id)).toEqual(["1"]);
    expect(filterTasksByQuery(tasks, "structured summary").map((task) => task.id)).toEqual(["1"]);
    expect(filterTasksByQuery(tasks, "ana").map((task) => task.id)).toEqual(["1"]);
    expect(filterTasksByQuery(tasks, "ux").map((task) => task.id)).toEqual(["1"]);
    expect(filterTasksByQuery(tasks, "25/04/2026").map((task) => task.id)).toEqual(["1"]);
    expect(filterTasksByQuery(tasks, "drag and drop").map((task) => task.id)).toEqual(["1"]);
    expect(filterTasksByQuery(tasks, "operacional").map((task) => task.id)).toEqual(["2"]);
    expect(filterTasksByQuery(tasks, "archive follow-up").map((task) => task.id)).toEqual(["3"]);
  });
});
