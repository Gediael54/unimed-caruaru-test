import type { Task, TaskStatus } from "./types";

export type TaskFilter = TaskStatus | "all";
export type TaskViewMode = "list" | "kanban" | "timeline" | "focus";

export type TaskSummary = {
  total: number;
  pending: number;
  completed: number;
};

export type TaskBucket = {
  status: TaskStatus;
  label: string;
  accent: string;
  description: string;
  emptyCopy: string;
  tasks: Task[];
};

export const taskFilters: Array<{ label: string; value: TaskFilter }> = [
  { label: "Todas", value: "all" },
  { label: "Pendentes", value: "pending" },
  { label: "Concluídas", value: "completed" }
];

export const taskViewModes: Array<{
  label: string;
  value: TaskViewMode;
  caption: string;
}> = [
  { label: "Lista", value: "list", caption: "Leitura direta" },
  { label: "Kanban", value: "kanban", caption: "Fluxo em colunas" },
  { label: "Timeline", value: "timeline", caption: "Movimento recente" },
  { label: "Em foco", value: "focus", caption: "Mesa do dia" }
];

const FILTER_LABELS: Record<TaskFilter, string> = {
  all: "Todas as tarefas",
  pending: "Tarefas pendentes",
  completed: "Tarefas concluídas"
};

const VIEW_DESCRIPTIONS: Record<TaskViewMode, string> = {
  list: "Visão linear para leitura rápida e ação direta.",
  kanban: "Colunas por status para bater o olho no fluxo.",
  timeline: "Ordem por atividade mais recente para entender o movimento do quadro.",
  focus: "Recorte operacional que separa o que pede ação agora do que acabou de ser concluído."
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Pendentes",
  completed: "Concluídas"
};

const STATUS_ACCENTS: Record<TaskStatus, string> = {
  pending: "Fila ativa",
  completed: "Saídas do quadro"
};

const STATUS_DESCRIPTIONS: Record<TaskStatus, string> = {
  pending: "Itens que ainda exigem ação da equipe.",
  completed: "Histórico recente do que já foi finalizado."
};

const STATUS_EMPTY_COPY: Record<TaskStatus, string> = {
  pending: "Nenhuma tarefa pendente neste recorte.",
  completed: "Nenhuma tarefa concluída neste recorte."
};

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short"
});

export function buildTaskSummary(tasks: Task[]): TaskSummary {
  return {
    total: tasks.length,
    pending: tasks.filter((task) => task.status === "pending").length,
    completed: tasks.filter((task) => task.status === "completed").length
  };
}

export function getTaskListLabel(filter: TaskFilter): string {
  return FILTER_LABELS[filter];
}

export function getViewDescription(viewMode: TaskViewMode): string {
  return VIEW_DESCRIPTIONS[viewMode];
}

export function buildTaskBuckets(tasks: Task[]): TaskBucket[] {
  return (["pending", "completed"] as TaskStatus[]).map((status) => ({
    status,
    label: STATUS_LABELS[status],
    accent: STATUS_ACCENTS[status],
    description: STATUS_DESCRIPTIONS[status],
    emptyCopy: STATUS_EMPTY_COPY[status],
    tasks: tasks.filter((task) => task.status === status)
  }));
}

export function sortTasksByRecentActivity(tasks: Task[]): Task[] {
  return [...tasks].sort((left, right) => {
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

export function describeTaskMoment(task: Task): string {
  const label = task.status === "completed" ? "Última atualização" : "Criada em";
  const source = task.status === "completed" ? task.updatedAt : task.createdAt;
  return `${label} ${dateTimeFormatter.format(new Date(source))}`;
}

export function formatTaskCode(id: string): string {
  const compact = id.replace(/-/g, "").slice(-6).toUpperCase();
  return `TB-${compact || "TASK"}`;
}
