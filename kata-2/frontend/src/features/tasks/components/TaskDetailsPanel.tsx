import {
  Archive,
  Ban,
  CheckCircle2,
  PencilLine,
  ListChecks,
  Play,
  RotateCcw,
  Tags,
  UserRound,
  X
} from "lucide-react";
import { parseTaskDescription } from "../model/task.description";
import {
  describeDueDateSignal,
  describeTaskMoment,
  describeTaskPriority,
  describeTaskStatus,
  formatTaskCode
} from "../model/task.formatters";
import type { Task, TaskStatus } from "../model/task.types";

type TaskDetailsPanelProps = {
  activeTaskId: string | null;
  isBusy: boolean;
  onArchive: (id: string) => Promise<void>;
  onClose: () => void;
  onEdit: () => void;
  onStatusChange: (id: string, status: TaskStatus) => Promise<void>;
  task: Task | null;
};

export function TaskDetailsPanel({
  activeTaskId,
  isBusy,
  onArchive,
  onClose,
  onEdit,
  onStatusChange,
  task
}: TaskDetailsPanelProps) {
  if (!task) {
    return null;
  }

  const description = parseTaskDescription(task.description);
  const isTaskBusy = activeTaskId === task.id;
  const actions = getTaskPanelActions(task);
  const dueDateSignal = describeDueDateSignal(description.dueDate);

  return (
    <aside className="task-details" aria-label={`Detalhes da tarefa ${task.title}`}>
      <header className="task-details-head">
        <div>
          <span className="task-details-code">{formatTaskCode(task.id)}</span>
          <h2>{task.title}</h2>
          <p>{describeTaskMoment(task)}</p>
        </div>
        <button
          aria-label="Fechar painel do card"
          className="icon-button"
          onClick={onClose}
          type="button"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </header>

      <div className="task-details-badges">
        <span className={`task-badge task-badge--${task.status}`}>{describeTaskStatus(task)}</span>
        <span className={`task-priority task-priority--${task.priority}`}>
          {describeTaskPriority(task)}
        </span>
      </div>

      <div className="task-details-layout">
        <div className="task-details-main">
          {description.summary ? (
            <section className="task-details-section task-details-section--summary">
              <h3>Resumo</h3>
              <p>{description.summary}</p>
            </section>
          ) : null}

          {description.assignees.length > 0 ? (
            <section className="task-details-section">
              <h3>
                <UserRound size={14} aria-hidden="true" />
                Responsáveis
              </h3>
              <div className="task-details-chip-row">
                {description.assignees.map((assignee) => (
                  <span className="task-details-person" key={`assignee-${task.id}-${assignee}`}>
                    <span className="task-details-person-avatar">{getInitials(assignee)}</span>
                    <span>{assignee}</span>
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {description.labels.length > 0 ? (
            <section className="task-details-section">
              <h3>
                <Tags size={14} aria-hidden="true" />
                Labels
              </h3>
              <div className="task-details-chip-row">
                {description.labels.map((label) => (
                  <span
                    className="task-indicator-chip task-indicator-chip--label"
                    key={`label-${task.id}-${label}`}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {description.checklist.length > 0 ? (
            <section className="task-details-section">
              <h3>
                <ListChecks size={14} aria-hidden="true" />
                Checklist
              </h3>
              <p className="task-details-section-caption">
                {formatChecklistProgress(
                  description.checklistProgress.completed,
                  description.checklistProgress.total
                )}
              </p>
              <ul className="task-details-checklist">
                {description.checklistItems.map((item) => (
                  <li
                    className={item.done ? "task-details-checklist-item--done" : ""}
                    key={`${task.id}-${item.text}`}
                  >
                    <CheckCircle2 size={14} aria-hidden="true" />
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className="task-details-side">
          <button className="ghost task-details-edit-button" onClick={onEdit} type="button">
            <PencilLine size={14} aria-hidden="true" />
            Editar card
          </button>

          <section className="task-details-overview">
            <div className="task-details-overview-item">
              <span>Status</span>
              <strong>{describeTaskStatus(task)}</strong>
            </div>
            <div className="task-details-overview-item">
              <span>Prioridade</span>
              <strong>{describeTaskPriority(task)}</strong>
            </div>
            <div className="task-details-overview-item">
              <span>Atualização</span>
              <strong>{describeTaskMoment(task)}</strong>
            </div>
            <div className="task-details-overview-item">
              <span>Prazo</span>
              <strong>{description.dueDate ?? "Sem data definida"}</strong>
              {description.dueDate ? (
                <small className={`task-details-signal task-details-signal--${dueDateSignal.tone}`}>
                  {dueDateSignal.label}
                </small>
              ) : null}
            </div>
          </section>

          <div className="task-details-actions">
            {actions.map((action, index) => (
              <button
                className={`${action.tone}${index === 0 ? " task-details-action-primary" : ""}`}
                disabled={isBusy || isTaskBusy}
                key={action.label}
                onClick={() =>
                  action.kind === "archive"
                    ? void onArchive(task.id)
                    : void onStatusChange(task.id, action.status)
                }
                type="button"
              >
                {action.icon}
                {isTaskBusy ? action.busyLabel : action.label}
              </button>
            ))}
          </div>
        </aside>
      </div>
    </aside>
  );
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

function getTaskPanelActions(task: Task) {
  switch (task.status) {
    case "pending":
      return [
        {
          label: "Iniciar card",
          busyLabel: "Movendo...",
          status: "in_progress" as const,
          kind: "status" as const,
          tone: "primary",
          icon: <Play size={14} aria-hidden="true" />
        },
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
      ];
    case "in_progress":
      return [
        {
          label: "Concluir",
          busyLabel: "Movendo...",
          status: "completed" as const,
          kind: "status" as const,
          tone: "primary",
          icon: <CheckCircle2 size={14} aria-hidden="true" />
        },
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
          icon: <RotateCcw size={14} aria-hidden="true" />
        },
        {
          label: "Arquivar",
          busyLabel: "Arquivando...",
          kind: "archive" as const,
          tone: "danger",
          icon: <Archive size={14} aria-hidden="true" />
        }
      ];
    case "archived":
      return [
        {
          label: "Restaurar",
          busyLabel: "Restaurando...",
          status: "pending" as const,
          kind: "status" as const,
          tone: "primary",
          icon: <RotateCcw size={14} aria-hidden="true" />
        }
      ];
  }
}
