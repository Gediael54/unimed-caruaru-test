import { describe, expect, it } from "vitest";
import {
  buildTaskBuckets,
  buildTaskSummary,
  describeTaskMoment,
  formatTaskCode,
  getTaskListLabel,
  getViewDescription,
  sortTasksByRecentActivity
} from "./task-board";
import type { Task } from "./types";

function makeTask(
  id: string,
  title: string,
  status: Task["status"],
  createdAt: string,
  updatedAt = createdAt
): Task {
  return {
    id,
    title,
    status,
    createdAt,
    updatedAt
  };
}

describe("task-board helpers", () => {
  it("builds summary counts and labels", () => {
    const tasks = [
      makeTask("1", "Triar paciente", "pending", "2026-04-20T08:00:00Z"),
      makeTask("2", "Fechar atendimento", "completed", "2026-04-20T09:00:00Z")
    ];

    expect(buildTaskSummary(tasks)).toEqual({
      total: 2,
      pending: 1,
      completed: 1
    });
    expect(getTaskListLabel("all")).toBe("Todas as tarefas");
    expect(getTaskListLabel("pending")).toBe("Tarefas pendentes");
    expect(getViewDescription("kanban")).toContain("fluxo");
    expect(getViewDescription("focus")).toContain("ação");
    expect(formatTaskCode("a1b2-c3d4")).toBe("TB-B2C3D4");
    expect(formatTaskCode("---")).toBe("TB-TASK");
  });

  it("builds buckets by status", () => {
    const tasks = [
      makeTask("1", "Task A", "pending", "2026-04-20T08:00:00Z"),
      makeTask("2", "Task B", "completed", "2026-04-20T09:00:00Z")
    ];

    expect(buildTaskBuckets(tasks)).toEqual([
      {
        status: "pending",
        label: "Pendentes",
        accent: "Fila ativa",
        description: "Itens que ainda exigem ação da equipe.",
        emptyCopy: "Nenhuma tarefa pendente neste recorte.",
        tasks: [tasks[0]]
      },
      {
        status: "completed",
        label: "Concluídas",
        accent: "Saídas do quadro",
        description: "Histórico recente do que já foi finalizado.",
        emptyCopy: "Nenhuma tarefa concluída neste recorte.",
        tasks: [tasks[1]]
      }
    ]);
  });

  it("sorts tasks by recent activity and describes timestamps", () => {
    const older = makeTask(
      "1",
      "Older",
      "pending",
      "2026-04-20T08:00:00Z",
      "2026-04-20T08:00:00Z"
    );
    const newer = makeTask(
      "2",
      "Newer",
      "completed",
      "2026-04-20T09:00:00Z",
      "2026-04-20T11:30:00Z"
    );

    expect(sortTasksByRecentActivity([older, newer]).map((task) => task.id)).toEqual([
      "2",
      "1"
    ]);
    expect(describeTaskMoment(older)).toContain("Criada em");
    expect(describeTaskMoment(newer)).toContain("Última atualização");
  });

  it("uses the creation timestamp as a tie-breaker when the last activity is equal", () => {
    const createdLater = makeTask(
      "1",
      "Task A",
      "completed",
      "2026-04-20T10:00:00Z",
      "2026-04-20T12:00:00Z"
    );
    const createdEarlier = makeTask(
      "2",
      "Task B",
      "completed",
      "2026-04-20T09:00:00Z",
      "2026-04-20T12:00:00Z"
    );

    expect(sortTasksByRecentActivity([createdEarlier, createdLater]).map((task) => task.id)).toEqual([
      "1",
      "2"
    ]);
  });
});
