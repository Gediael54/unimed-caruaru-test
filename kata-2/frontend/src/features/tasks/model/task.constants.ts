import type {
  ActiveTaskStatus,
  TaskFilter,
  TaskPriority,
  TaskStatus,
  TaskViewMode
} from "./task.types";

export const activeTaskStatuses: ActiveTaskStatus[] = [
  "pending",
  "in_progress",
  "completed",
  "cancelled"
];

export const taskFilters: Array<{ label: string; value: TaskFilter }> = [
  { label: "Todas", value: "all" },
  { label: "Pendentes", value: "pending" },
  { label: "Em andamento", value: "in_progress" },
  { label: "Concluídas", value: "completed" },
  { label: "Canceladas", value: "cancelled" },
  { label: "Arquivadas", value: "archived" }
];

export const taskViewModes: Array<{
  label: string;
  value: TaskViewMode;
  caption: string;
}> = [
  { label: "Lista", value: "list", caption: "Leitura direta" },
  { label: "Kanban", value: "kanban", caption: "Fluxo em colunas" },
  { label: "Timeline", value: "timeline", caption: "Movimento recente" },
  { label: "Em foco", value: "focus", caption: "Ritmo operacional" }
];

export const FILTER_LABELS: Record<TaskFilter, string> = {
  all: "Todas as tarefas ativas",
  pending: "Tarefas pendentes",
  in_progress: "Tarefas em andamento",
  completed: "Tarefas concluídas",
  cancelled: "Tarefas canceladas",
  archived: "Tarefas arquivadas"
};

export const VIEW_DESCRIPTIONS: Record<TaskViewMode, string> = {
  list: "Visão linear para criação, leitura e ação rápida no board.",
  kanban: "Colunas por status para visualizar backlog, execução, entregas e descartes.",
  timeline: "Ordem por atividade mais recente para entender o ritmo do quadro.",
  focus: "Recorte operacional que separa ação imediata de fechamentos do board."
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Pendente",
  in_progress: "Em andamento",
  completed: "Concluída",
  cancelled: "Cancelada",
  archived: "Arquivada"
};

export const STATUS_ACCENTS: Record<ActiveTaskStatus, string> = {
  pending: "Fila priorizada",
  in_progress: "Execução ativa",
  completed: "Entregas",
  cancelled: "Descartes"
};

export const STATUS_DESCRIPTIONS: Record<ActiveTaskStatus, string> = {
  pending: "Cards aguardando início de execução.",
  in_progress: "Cards que já estão em andamento no workspace.",
  completed: "Cards entregues e prontos para sair do foco diário.",
  cancelled: "Cards interrompidos ou descartados com registro preservado."
};

export const STATUS_EMPTY_COPY: Record<ActiveTaskStatus, string> = {
  pending: "Nenhuma tarefa pendente neste recorte.",
  in_progress: "Nenhuma tarefa em andamento neste recorte.",
  completed: "Nenhuma tarefa concluída neste recorte.",
  cancelled: "Nenhuma tarefa cancelada neste recorte."
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta"
};

export const PRIORITY_DESCRIPTIONS: Record<TaskPriority, string> = {
  low: "Pode esperar sem bloquear o fluxo principal.",
  medium: "Importante para o ritmo normal do board.",
  high: "Precisa de atenção antes das demais."
};
