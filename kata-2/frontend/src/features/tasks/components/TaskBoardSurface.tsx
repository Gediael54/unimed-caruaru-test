import { useState, type CSSProperties, type DragEvent, type ReactNode } from "react";
import {
  Archive,
  Ban,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  Inbox,
  ListChecks,
  Plus,
  Play,
  RotateCcw,
} from "lucide-react";
import {
  buildFocusBuckets,
  buildTaskBuckets,
  getPriorityLabel,
  getViewDescription,
} from "../model/task.selectors";
import {
  describeDueDateSignal,
  describeTaskMoment,
  describeTaskPriority,
  describeTaskStatus,
  formatTaskCode
} from "../model/task.formatters";
import { parseTaskDescription } from "../model/task.description";
import type {
  ActiveTaskStatus,
  Task,
  TaskFilter,
  TaskStatus,
  TaskViewMode
} from "../model/task.types";

type TaskBoardSurfaceProps = {
  activeTaskId: string | null;
  count: number;
  currentFilter: TaskFilter;
  emptyState?: {
    copy: string;
    hideCreateAction?: boolean;
    title: string;
  } | null;
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
  draggable?: boolean;
  isLoading: boolean;
  isDragging?: boolean;
  onArchive: (id: string) => Promise<void>;
  onDragEnd?: () => void;
  onDragStart?: (task: Task, event: DragEvent<HTMLElement>) => void;
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

type KanbanDragState = {
  sourceStatus: ActiveTaskStatus;
  taskId: string;
};

type TaskActionTone = "primary" | "ghost" | "danger";

type TaskStatusAction = {
  busyLabel: string;
  icon: ReactNode;
  kind: "status";
  label: string;
  status: TaskStatus;
  tone: TaskActionTone;
};

type TaskArchiveAction = {
  busyLabel: string;
  icon: ReactNode;
  kind: "archive";
  label: string;
  tone: TaskActionTone;
};

type TaskActionSet = {
  primaryAction: TaskStatusAction;
  secondaryActions: Array<TaskStatusAction | TaskArchiveAction>;
};

export function TaskBoardSurface({
  activeTaskId,
  count,
  currentFilter,
  emptyState = null,
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
  const isArchiveSlice = currentFilter === "archived";
  const [draggedTask, setDraggedTask] = useState<KanbanDragState | null>(null);
  const [dropTargetStatus, setDropTargetStatus] = useState<ActiveTaskStatus | null>(null);

  function clearDragState() {
    setDraggedTask(null);
    setDropTargetStatus(null);
  }

  function handleDragStart(task: Task, event: DragEvent<HTMLElement>) {
    const sourceStatus = task.status as ActiveTaskStatus;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-task-id", task.id);
    event.dataTransfer.setData("application/x-task-status", sourceStatus);
    setDraggedTask({ taskId: task.id, sourceStatus });
    setDropTargetStatus(null);
  }

  function handleDragOver(status: ActiveTaskStatus, event: DragEvent<HTMLElement>) {
    if (!draggedTask || draggedTask.sourceStatus === status) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (dropTargetStatus !== status) {
      setDropTargetStatus(status);
    }
  }

  function handleDrop(status: ActiveTaskStatus, event: DragEvent<HTMLElement>) {
    const taskId = event.dataTransfer.getData("application/x-task-id");
    const sourceStatus = event.dataTransfer.getData(
      "application/x-task-status"
    ) as ActiveTaskStatus | "";

    event.preventDefault();
    clearDragState();

    if (!taskId || !sourceStatus || sourceStatus === status) {
      return;
    }

    void onStatusChange(taskId, status);
  }

  return (
    <section className={`board-stage board-stage--${viewMode}`}>
      <div className="board-stage-head">
        <div className="board-stage-head-copy">
          <h3>{listLabel}</h3>
          <p className="board-stage-subtitle">
            {isArchiveSlice
              ? "Esta visão mostra cards fora do board ativo, preservados para histórico."
              : getViewDescription(viewMode)}
          </p>
        </div>
        <div className="board-stage-head-actions">
          <span className="count-pill" aria-label={`${count} ${count === 1 ? "tarefa" : "tarefas"}`}>
            {count} {count === 1 ? "tarefa" : "tarefas"}
          </span>
        </div>
      </div>

      {renderCollectionState(isLoading, tasks.length, currentFilter, emptyState, onCreateTask)}

      {tasks.length > 0
        ? isArchiveSlice
          ? renderArchiveView({
              activeTaskId,
              isLoading,
              onArchive,
              onSelectTask,
              onStatusChange,
              selectedTaskId,
              tasks
            })
          : viewMode === "kanban"
            ? renderKanbanView({
                activeTaskId,
                draggedTask,
                dropTargetStatus,
                isLoading,
                onArchive,
                onDragEnd: clearDragState,
                onDragOver: handleDragOver,
                onDragStart: handleDragStart,
                onDrop: handleDrop,
                onSelectTask,
                onStatusChange,
                selectedTaskId,
                tasks
              })
            : viewMode === "timeline"
              ? renderTimelineView({
                  activeTaskId,
                  isLoading,
                  onArchive,
                  onSelectTask,
                  onStatusChange,
                  selectedTaskId,
                  tasks
                })
              : viewMode === "focus"
                ? renderFocusView({
                    activeTaskId,
                    isLoading,
                    onArchive,
                    onSelectTask,
                    onStatusChange,
                    selectedTaskId,
                    tasks
                  })
                : renderListView({
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
  emptyState: TaskBoardSurfaceProps["emptyState"],
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
      emptyState?.copy
      ?? (filter === "archived"
        ? "Nenhum card arquivado neste workspace."
        : "Crie um novo card ou troque o filtro para revisar outro estágio do board.");
    const emptyTitle = emptyState?.title ?? "Nenhum card por aqui";
    const hideCreateAction = emptyState?.hideCreateAction ?? filter === "archived";

    return (
      <section className="task-list" aria-live="polite">
        <div className="empty-state">
          <span className="empty-icon" aria-hidden="true">
            <Inbox size={24} />
          </span>
          <strong>{emptyTitle}</strong>
          <span>{emptyCopy}</span>
          {!hideCreateAction && onCreateTask ? (
            <button className="primary" onClick={onCreateTask} type="button">
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
      {props.tasks.map((task) => (
        <TaskCard key={task.id} task={task} {...props} />
      ))}
    </section>
  );
}

function renderArchiveView(props: RendererProps) {
  return (
    <section className="task-list" aria-label="Lista de tarefas arquivadas" aria-live="polite">
      {props.tasks.map((task) => (
        <TaskCard key={task.id} task={task} timeLabel={describeTaskMoment(task)} {...props} />
      ))}
    </section>
  );
}

type KanbanRendererProps = RendererProps & {
  draggedTask: KanbanDragState | null;
  dropTargetStatus: ActiveTaskStatus | null;
  onDragEnd: () => void;
  onDragOver: (status: ActiveTaskStatus, event: DragEvent<HTMLElement>) => void;
  onDragStart: (task: Task, event: DragEvent<HTMLElement>) => void;
  onDrop: (status: ActiveTaskStatus, event: DragEvent<HTMLElement>) => void;
};

function renderKanbanView(props: KanbanRendererProps) {
  return (
    <section className="kanban-board" aria-label="Quadro kanban" aria-live="polite">
      {buildTaskBuckets(props.tasks).map((bucket) => (
        <section
          className={`kanban-column kanban-column--${bucket.status}${
            props.draggedTask && props.draggedTask.sourceStatus !== bucket.status
              ? " kanban-column--droppable"
              : ""
          }${props.dropTargetStatus === bucket.status ? " kanban-column--drag-over" : ""}`}
          key={bucket.status}
          onDragEnter={(event) => props.onDragOver(bucket.status, event)}
          onDragOver={(event) => props.onDragOver(bucket.status, event)}
          onDrop={(event) => props.onDrop(bucket.status, event)}
        >
          <header className="kanban-column-head">
            <div className="kanban-column-copy">
              <span className="kanban-column-kicker">{bucket.accent}</span>
              <h3>{bucket.label}</h3>
              <p className="kanban-column-description">{bucket.description}</p>
            </div>
            <span className="kanban-column-count">{bucket.tasks.length}</span>
          </header>

          <div className="kanban-column-body">
            {bucket.tasks.length === 0 ? (
              <div className="kanban-empty">{bucket.emptyCopy}</div>
            ) : (
              bucket.tasks.map((task) => (
                <TaskCard
                  {...props}
                  draggable={!props.isLoading && props.activeTaskId !== task.id}
                  isDragging={props.draggedTask?.taskId === task.id}
                  key={task.id}
                  onDragEnd={props.onDragEnd}
                  onDragStart={props.onDragStart}
                  task={task}
                  timeLabel={describeTaskMoment(task)}
                  variant="stacked"
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
      <section className="focus-panel focus-panel--pending">
        <header className="focus-panel-head">
          <h3>Fila ativa do workspace</h3>
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

      <section className="focus-panel focus-panel--completed">
        <header className="focus-panel-head">
          <h3>Concluídas e canceladas</h3>
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
    <section className="timeline-board" aria-label="Timeline das tarefas" aria-live="polite">
      <header className="timeline-head">
        <h3>Atividade mais recente</h3>
      </header>

      <ol className="timeline-list">
        {props.tasks.map((task) => (
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
  draggable = false,
  isDragging = false,
  onArchive,
  onDragEnd,
  onDragStart,
  onSelectTask,
  onStatusChange,
  selectedTaskId,
  task,
  timeLabel,
  variant = "default"
}: TaskCardProps) {
  const isTaskBusy = activeTaskId === task.id;
  const isSelected = selectedTaskId === task.id;
  const variantClass = variant === "default" ? "" : ` task-card--${variant}`;
  const dragClass = draggable ? " task-card--draggable" : "";
  const draggingClass = isDragging ? " task-card--dragging" : "";
  const priorityClass = `task-priority task-priority--${task.priority}`;
  const statusClass = `task-status-text task-status-text--${task.status}`;
  const badgeClass = `task-badge task-badge--${task.status}`;
  const icon = getStatusIcon(task.status);
  const { primaryAction, secondaryActions } = getTaskActions(task);
  const description = parseTaskDescription(task.description);
  const dueDateSignal = describeDueDateSignal(description.dueDate);
  const checklistProgressLabel = formatChecklistProgress(
    description.checklistProgress.completed,
    description.checklistProgress.total
  );
  const checklistProgressPercent =
    description.checklistProgress.total === 0
      ? 0
      : Math.round(
          (description.checklistProgress.completed / description.checklistProgress.total) * 100
        );
  const checklistMeterStyle = {
    "--task-checklist-progress": `${checklistProgressPercent}%`
  } as CSSProperties;

  return (
    <article
      className={`task-card task-card--${task.status}${variantClass}${dragClass}${draggingClass}${isSelected ? " task-card--selected" : ""}`}
      draggable={draggable}
      onClick={() => onSelectTask?.(task)}
      onDragEnd={() => onDragEnd?.()}
      onDragStart={(event) => onDragStart?.(task, event)}
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
        {description.summary ? <p className="task-description">{description.summary}</p> : null}
        {description.labels.length > 0
        || description.assignees.length > 0
        || description.dueDate
        || description.checklist.length > 0 ? (
          <div className="task-card-context">
            {description.labels.length > 0 || description.assignees.length > 0 || description.dueDate ? (
              <div className="task-indicator-row">
                {description.dueDate ? (
                  <>
                    <span className="task-indicator-chip task-indicator-chip--meta">
                      <CalendarDays size={12} aria-hidden="true" />
                      Prazo: {description.dueDate}
                    </span>
                    <span
                      className={`task-indicator-chip task-indicator-chip--due task-indicator-chip--due-${dueDateSignal.tone}`}
                    >
                      {dueDateSignal.label}
                    </span>
                  </>
                ) : null}
                {description.assignees.map((assignee) => (
                  <span className="task-assignee-pill" key={`assignee-${task.id}-${assignee}`}>
                    <span className="task-assignee-avatar">{getInitials(assignee)}</span>
                    <span className="task-assignee-name">{assignee}</span>
                  </span>
                ))}
                {description.labels.map((label) => (
                  <span className="task-indicator-chip task-indicator-chip--label" key={`label-${task.id}-${label}`}>
                    {label}
                  </span>
                ))}
              </div>
            ) : null}
            {description.checklist.length > 0 ? (
              <div className="task-checklist-shell">
                <div className="task-checklist-head">
                  <span>
                    <ListChecks size={13} aria-hidden="true" />
                    Checklist
                  </span>
                  <strong>{checklistProgressLabel}</strong>
                </div>
                <div
                  aria-hidden="true"
                  className="task-checklist-meter"
                  style={checklistMeterStyle}
                />
                <ul className="task-checklist-preview" aria-label="Checklist resumido do card">
                  {description.checklistItems.slice(0, 3).map((item) => (
                    <li
                      className={item.done ? "task-checklist-item--done" : ""}
                      key={`${task.id}-${item.text}`}
                    >
                      {item.text}
                    </li>
                  ))}
                  {description.checklist.length > 3 ? (
                    <li className="task-checklist-more">+{description.checklist.length - 3} itens</li>
                  ) : null}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="task-card-footer">
          <div className="task-meta-row">
            <span className={statusClass}>
              {getStatusIcon(task.status, 12)}
              <span>{getStatusLabelText(task.status)}</span>
            </span>
            <span className="task-priority-copy">Prioridade {getPriorityLabel(task.priority)}</span>
            {timeLabel ? <span className="task-time">{timeLabel}</span> : null}
          </div>
          <div className="task-actions">
            <button
              className={`${primaryAction.tone} task-action-primary`}
              disabled={isLoading || isTaskBusy}
              onClick={(event) => {
                event.stopPropagation();
                void onStatusChange(task.id, primaryAction.status);
              }}
              type="button"
            >
              {primaryAction.icon}
              {isTaskBusy ? primaryAction.busyLabel : primaryAction.label}
            </button>
            <div className="task-action-secondary-row">
              {secondaryActions.map((action) => (
                <button
                  aria-label={action.kind === "archive" ? `Arquivar tarefa ${task.title}` : undefined}
                  className={`${action.tone} task-action-secondary`}
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
          </div>
        </div>
      </div>
    </article>
  );
}

function getTaskActions(task: Task): TaskActionSet {
  switch (task.status) {
    case "pending":
      return {
        primaryAction: {
          label: "Iniciar",
          busyLabel: "Movendo...",
          status: "in_progress" as const,
          kind: "status" as const,
          tone: "primary",
          icon: <Play size={14} aria-hidden="true" />
        },
        secondaryActions: [
          {
          label: "Cancelar",
          busyLabel: "Movendo...",
          status: "cancelled" as const,
          kind: "status" as const,
          tone: "ghost",
          icon: <Ban size={14} aria-hidden="true" />
          },
          {
          label: "Arquivar",
          busyLabel: "Arquivando...",
          kind: "archive" as const,
          tone: "danger",
          icon: <Archive size={14} aria-hidden="true" />
          }
        ]
      };
    case "in_progress":
      return {
        primaryAction: {
          label: "Concluir",
          busyLabel: "Movendo...",
          status: "completed" as const,
          kind: "status" as const,
          tone: "primary",
          icon: <CheckCircle2 size={14} aria-hidden="true" />
        },
        secondaryActions: [
          {
          label: "Cancelar",
          busyLabel: "Movendo...",
          status: "cancelled" as const,
          kind: "status" as const,
          tone: "ghost",
          icon: <Ban size={14} aria-hidden="true" />
          },
          {
          label: "Arquivar",
          busyLabel: "Arquivando...",
          kind: "archive" as const,
          tone: "danger",
          icon: <Archive size={14} aria-hidden="true" />
          }
        ]
      };
    case "completed":
    case "cancelled":
      return {
        primaryAction: {
          label: "Reabrir",
          busyLabel: "Reabrindo...",
          status: "pending" as const,
          kind: "status" as const,
          tone: "ghost",
          icon: <RotateCcw size={14} aria-hidden="true" />
        },
        secondaryActions: [
          {
          label: "Arquivar",
          busyLabel: "Arquivando...",
          kind: "archive" as const,
          tone: "danger",
          icon: <Archive size={14} aria-hidden="true" />
          }
        ]
      };
    case "archived":
      return {
        primaryAction: {
          label: "Restaurar",
          busyLabel: "Restaurando...",
          status: "pending" as const,
          kind: "status" as const,
          tone: "primary",
          icon: <RotateCcw size={14} aria-hidden="true" />
        },
        secondaryActions: []
      };
  }
}

function getStatusIcon(status: TaskStatus, size = 16) {
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

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function formatChecklistProgress(completed: number, total: number) {
  if (total === 1) {
    return `${completed}/1 concluído`;
  }

  return `${completed}/${total} concluídos`;
}
