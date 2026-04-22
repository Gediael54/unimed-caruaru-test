import type { ReactNode } from "react";
import {
  Archive,
  Ban,
  CheckCircle2,
  Circle,
  Clock3,
  Inbox,
  Plus,
  Play,
  RotateCcw
} from "lucide-react";
import {
  buildFocusBuckets,
  buildTaskBuckets,
  getPriorityLabel,
  getViewDescription,
  sortTasksByRecentActivity
} from "../model/task.selectors";
import {
  describeTaskMoment,
  describeTaskPriority,
  describeTaskStatus,
  formatTaskCode
} from "../model/task.formatters";
import { parseTaskDescription } from "../model/task.description";
import type { Task, TaskFilter, TaskStatus, TaskViewMode } from "../model/task.types";

type TaskBoardSurfaceProps = {
  activeTaskId: string | null;
  count: number;
  currentFilter: TaskFilter;
  isLoading: boolean;
  listLabel: string;
  onArchive: (id: string) => Promise<void>;
  onCreateTask?: () => void;
  onSelectTask?: (task: Task) => void;
  onStatusChange: (id: string, status: TaskStatus) => Promise<void>;
  selectedTaskId?: string | null;
  tasks: Task[];
  viewMode: TaskViewMode;
};

type TaskCardProps = {
  activeTaskId: string | null;
  isLoading: boolean;
  onArchive: (id: string) => Promise<void>;
  onSelectTask?: (task: Task) => void;
  onStatusChange: (id: string, status: TaskStatus) => Promise<void>;
  selectedTaskId?: string | null;
  task: Task;
  timeLabel?: string;
  variant?: "default" | "stacked" | "timeline";
};

type RendererProps = Omit<
  TaskBoardSurfaceProps,
  "count" | "currentFilter" | "listLabel" | "viewMode"
>;

type Renderer = (props: RendererProps) => ReactNode;

const boardSurfaceCopy: Record<
  TaskViewMode,
  { badge: string; title: string; note: string }
> = {
  list: {
    badge: "Leitura direta",
    title: "Cards prontos para leitura, triagem e ação rápida",
    note: "A lista continua sendo a melhor visão para conferir o contrato principal do board."
  },
  kanban: {
    badge: "Quadro operacional",
    title: "Colunas por estágio do trabalho, sem esconder o que foi cancelado",
    note: "Kanban ajuda a revisar backlog, execução, entregas e descartes no mesmo fluxo."
  },
  timeline: {
    badge: "Ritmo do board",
    title: "Linha do tempo do que acabou de acontecer",
    note: "Boa para perceber movimento recente sem perder contexto de prioridade e estado."
  },
  focus: {
    badge: "Leitura executiva",
    title: "Mesa de foco entre o que pede ação agora e o que já saiu do circuito",
    note: "Separa trabalho ativo de fechamentos recentes sem criar outra regra de produto."
  }
};

const renderers: Record<TaskViewMode, Renderer> = {
  list: renderListView,
  kanban: renderKanbanView,
  timeline: renderTimelineView,
  focus: renderFocusView
};

export function TaskBoardSurface({
  activeTaskId,
  count,
  currentFilter,
  isLoading,
  listLabel,
  onArchive,
  onCreateTask,
  onSelectTask,
  onStatusChange,
  selectedTaskId,
  tasks,
  viewMode
}: TaskBoardSurfaceProps) {
  const surfaceCopy = boardSurfaceCopy[viewMode];
  const isArchiveSlice = currentFilter === "archived";

  return (
    <section className={`board-stage board-stage--${viewMode}`}>
      <div className="board-stage-header">
        <div>
          <span className="board-stage-badge">{surfaceCopy.badge}</span>
          <h2>{surfaceCopy.title}</h2>
          <p>{surfaceCopy.note}</p>
        </div>
        <div className="board-stage-accent" aria-hidden="true" />
      </div>

      <div className="task-list-header">
        <div className="task-list-header-copy">
          <h3>{listLabel}</h3>
          <p>{getViewDescription(viewMode)}</p>
          <p>
            {isArchiveSlice
              ? "Esta visão mostra cards fora do board ativo, preservados para histórico."
              : "Os indicadores acima continuam considerando o board ativo, mesmo quando o filtro recorta um estágio."}
          </p>
        </div>
        <div className="task-list-header-actions">
          {onCreateTask ? (
            <button className="board-stage-action" onClick={onCreateTask} type="button">
              <Plus size={16} aria-hidden="true" />
              Novo card
            </button>
          ) : null}
          <span className="count-pill" aria-label={`${count} ${count === 1 ? "tarefa" : "tarefas"}`}>
            {count} {count === 1 ? "tarefa" : "tarefas"}
          </span>
        </div>
      </div>

      {renderCollectionState(isLoading, tasks.length, currentFilter, onCreateTask)}

      {tasks.length > 0
        ? isArchiveSlice
          ? renderArchiveView({ activeTaskId, isLoading, onArchive, onStatusChange, tasks })
          : renderers[viewMode]({
              activeTaskId,
              isLoading,
              onArchive,
              onSelectTask,
              onStatusChange,
              selectedTaskId,
              tasks
            })
        : null}
    </section>
  );
}

function renderCollectionState(
  isLoading: boolean,
  count: number,
  filter: TaskFilter,
  onCreateTask?: () => void
) {
  if (isLoading && count === 0) {
    return (
      <section className="task-list" aria-live="polite">
        <div className="loading-state">
          <span className="spinner" aria-hidden="true" />
          <span>Carregando cards do board...</span>
        </div>
      </section>
    );
  }

  if (!isLoading && count === 0) {
    const emptyCopy =
      filter === "archived"
        ? "Nenhum card arquivado neste workspace."
        : "Crie um novo card ou troque o filtro para revisar outro estágio do board.";

    return (
      <section className="task-list" aria-live="polite">
        <div className="empty-state">
          <span className="empty-icon" aria-hidden="true">
            <Inbox size={24} />
          </span>
          <strong>Nenhum card por aqui</strong>
          <span>{emptyCopy}</span>
          {filter !== "archived" && onCreateTask ? (
            <button className="board-stage-action" onClick={onCreateTask} type="button">
              <Plus size={16} aria-hidden="true" />
              Criar primeiro card
            </button>
          ) : null}
        </div>
      </section>
    );
  }

  return null;
}

function renderListView(props: RendererProps) {
  return (
    <section className="task-list" aria-label="Lista de tarefas" aria-live="polite">
      {sortTasksByRecentActivity(props.tasks).map((task) => (
        <TaskCard key={task.id} task={task} {...props} />
      ))}
    </section>
  );
}

function renderArchiveView(props: RendererProps) {
  return (
    <section className="task-list" aria-label="Lista de tarefas arquivadas" aria-live="polite">
      {sortTasksByRecentActivity(props.tasks).map((task) => (
        <TaskCard key={task.id} task={task} timeLabel={describeTaskMoment(task)} {...props} />
      ))}
    </section>
  );
}

function renderKanbanView(props: RendererProps) {
  return (
    <section className="kanban-board" aria-label="Quadro kanban" aria-live="polite">
      {buildTaskBuckets(props.tasks).map((bucket) => (
        <section className="kanban-column panel" key={bucket.status}>
          <header className="kanban-column-header">
            <div>
              <span className={`lane-chip lane-chip--${bucket.status}`}>{bucket.accent}</span>
              <h3>{bucket.label}</h3>
              <p>{bucket.description}</p>
            </div>
            <div className="kanban-column-metric">
              <strong>{bucket.tasks.length}</strong>
              <span>{bucket.tasks.length === 1 ? "item" : "itens"}</span>
            </div>
          </header>

          <div className="kanban-column-body">
            {bucket.tasks.length === 0 ? (
              <div className="kanban-empty">{bucket.emptyCopy}</div>
            ) : (
              sortTasksByRecentActivity(bucket.tasks).map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  timeLabel={describeTaskMoment(task)}
                  variant="stacked"
                  {...props}
                />
              ))
            )}
          </div>
        </section>
      ))}
    </section>
  );
}

function renderFocusView(props: RendererProps) {
  const buckets = buildFocusBuckets(props.tasks);

  return (
    <section className="focus-board" aria-label="Quadro em foco" aria-live="polite">
      <section className="focus-panel panel focus-panel--pending">
        <header className="focus-panel-header">
          <div>
            <span className="focus-kicker">Ação imediata</span>
            <h3>Fila ativa do workspace</h3>
            <p>Reúne pendentes e cards em andamento ordenados por prioridade e atividade.</p>
          </div>
          <span className="count-pill">{buckets.active.length}</span>
        </header>

        <div className="focus-panel-body">
          {buckets.active.length === 0 ? (
            <div className="kanban-empty">Nenhum card exigindo ação imediata neste recorte.</div>
          ) : (
            buckets.active.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                timeLabel={describeTaskMoment(task)}
                variant="stacked"
                {...props}
              />
            ))
          )}
        </div>
      </section>

      <section className="focus-panel panel focus-panel--completed">
        <header className="focus-panel-header">
          <div>
            <span className="focus-kicker">Fechamentos</span>
            <h3>Concluídas e canceladas</h3>
            <p>Ajuda a revisar o que saiu do ciclo ativo sem depender de exclusão destrutiva.</p>
          </div>
          <span className="count-pill">{buckets.closed.length}</span>
        </header>

        <div className="focus-panel-body">
          {buckets.closed.length === 0 ? (
            <div className="kanban-empty">Nenhum fechamento recente neste recorte.</div>
          ) : (
            buckets.closed.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                timeLabel={describeTaskMoment(task)}
                variant="stacked"
                {...props}
              />
            ))
          )}
        </div>
      </section>
    </section>
  );
}

function renderTimelineView(props: RendererProps) {
  return (
    <section className="timeline-board panel" aria-label="Timeline das tarefas" aria-live="polite">
      <header className="timeline-header">
        <h3>Atividade mais recente</h3>
        <p>A ordenação considera prioridade, última atualização e criação do card.</p>
      </header>

      <ol className="timeline-list">
        {sortTasksByRecentActivity(props.tasks).map((task) => (
          <li className="timeline-entry" key={task.id}>
            <span className="timeline-marker" aria-hidden="true" />
            <TaskCard
              task={task}
              timeLabel={describeTaskMoment(task)}
              variant="timeline"
              {...props}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}

function TaskCard({
  activeTaskId,
  isLoading,
  onArchive,
  onSelectTask,
  onStatusChange,
  selectedTaskId,
  task,
  timeLabel,
  variant = "default"
}: TaskCardProps) {
  const isTaskBusy = activeTaskId === task.id;
  const isSelected = selectedTaskId === task.id;
  const variantClass = variant === "default" ? "" : ` task-item--${variant}`;
  const priorityClass = `task-priority task-priority--${task.priority}`;
  const statusClass = `task-status-text task-status-text--${task.status}`;
  const badgeClass = `task-badge task-badge--${task.status}`;
  const icon = getStatusIcon(task.status);
  const actions = getTaskActions(task);
  const description = parseTaskDescription(task.description);

  return (
    <article
      className={`task-item task-item--${task.status}${variantClass}${isSelected ? " task-item--selected" : ""}`}
      onClick={() => onSelectTask?.(task)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelectTask?.(task);
        }
      }}
      role={onSelectTask ? "button" : undefined}
      tabIndex={onSelectTask ? 0 : undefined}
    >
      <span className={`task-status-icon task-status-icon--${task.status}`} aria-hidden="true">
        {icon}
      </span>
      <div className="task-body">
        <div className="task-card-top">
          <div className="task-card-tags">
            <span className={badgeClass}>{describeTaskStatus(task)}</span>
            <span className={priorityClass}>{describeTaskPriority(task)}</span>
          </div>
          <span className="task-code">{formatTaskCode(task.id)}</span>
        </div>
        <p className="task-title">{task.title}</p>
        {description.labels.length > 0 || description.assignees.length > 0 || description.dueDate ? (
          <div className="task-indicator-row">
            {description.dueDate ? (
              <span className="task-indicator-chip">Prazo: {description.dueDate}</span>
            ) : null}
            {description.assignees.map((assignee) => (
              <span className="task-indicator-chip" key={`assignee-${task.id}-${assignee}`}>
                {assignee}
              </span>
            ))}
            {description.labels.map((label) => (
              <span className="task-indicator-chip task-indicator-chip--label" key={`label-${task.id}-${label}`}>
                {label}
              </span>
            ))}
          </div>
        ) : null}
        {description.summary ? <p className="task-description">{description.summary}</p> : null}
        {description.checklist.length > 0 ? (
          <ul className="task-checklist-preview" aria-label="Checklist resumido do card">
            {description.checklist.slice(0, 3).map((item) => (
              <li key={`${task.id}-${item}`}>{item}</li>
            ))}
            {description.checklist.length > 3 ? (
              <li className="task-checklist-more">+{description.checklist.length - 3} itens</li>
            ) : null}
          </ul>
        ) : null}
        <div className="task-meta-row">
          <span className={statusClass}>
            {getStatusIcon(task.status, 12)}
            <span>{getStatusLabelText(task.status)}</span>
          </span>
          <span className="task-priority-copy">Prioridade {getPriorityLabel(task.priority)}</span>
          {timeLabel ? <span className="task-time">{timeLabel}</span> : null}
        </div>
        {actions.length > 0 ? (
          <div className="task-actions">
            {actions.map((action) => (
              <button
                aria-label={action.kind === "archive" ? `Arquivar tarefa ${task.title}` : undefined}
                className={action.tone}
                disabled={isLoading || isTaskBusy}
                key={action.label}
                onClick={(event) => {
                  event.stopPropagation();
                  if (action.kind === "archive") {
                    void onArchive(task.id);
                    return;
                  }

                  void onStatusChange(task.id, action.status);
                }}
                type="button"
              >
                {action.icon}
                {isTaskBusy ? action.busyLabel : action.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function getTaskActions(task: Task) {
  switch (task.status) {
    case "pending":
      return [
        {
          label: "Iniciar",
          busyLabel: "Movendo...",
          status: "in_progress" as const,
          kind: "status" as const,
          tone: "",
          icon: <Play size={16} aria-hidden="true" />
        },
        {
          label: "Cancelar",
          busyLabel: "Movendo...",
          status: "cancelled" as const,
          kind: "status" as const,
          tone: "ghost",
          icon: <Ban size={16} aria-hidden="true" />
        },
        {
          label: "Arquivar",
          busyLabel: "Arquivando...",
          kind: "archive" as const,
          tone: "danger",
          icon: <Archive size={16} aria-hidden="true" />
        }
      ];
    case "in_progress":
      return [
        {
          label: "Concluir",
          busyLabel: "Movendo...",
          status: "completed" as const,
          kind: "status" as const,
          tone: "",
          icon: <CheckCircle2 size={16} aria-hidden="true" />
        },
        {
          label: "Cancelar",
          busyLabel: "Movendo...",
          status: "cancelled" as const,
          kind: "status" as const,
          tone: "ghost",
          icon: <Ban size={16} aria-hidden="true" />
        },
        {
          label: "Arquivar",
          busyLabel: "Arquivando...",
          kind: "archive" as const,
          tone: "danger",
          icon: <Archive size={16} aria-hidden="true" />
        }
      ];
    case "completed":
    case "cancelled":
      return [
        {
          label: "Reabrir",
          busyLabel: "Reabrindo...",
          status: "pending" as const,
          kind: "status" as const,
          tone: "ghost",
          icon: <RotateCcw size={16} aria-hidden="true" />
        },
        {
          label: "Arquivar",
          busyLabel: "Arquivando...",
          kind: "archive" as const,
          tone: "danger",
          icon: <Archive size={16} aria-hidden="true" />
        }
      ];
    case "archived":
      return [];
  }
}

function getStatusIcon(status: TaskStatus, size = 20) {
  switch (status) {
    case "pending":
      return <Circle size={size} />;
    case "in_progress":
      return <Clock3 size={size} />;
    case "completed":
      return <CheckCircle2 size={size} />;
    case "cancelled":
      return <Ban size={size} />;
    case "archived":
      return <Archive size={size} />;
  }
}

function getStatusLabelText(status: TaskStatus) {
  switch (status) {
    case "pending":
      return "Na fila do board";
    case "in_progress":
      return "Em execução";
    case "completed":
      return "Entrega concluída";
    case "cancelled":
      return "Fluxo encerrado";
    case "archived":
      return "Fora do board ativo";
  }
}
