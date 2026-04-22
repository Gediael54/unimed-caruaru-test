import {
  Archive,
  Ban,
  CalendarDays,
  CheckCircle2,
  Circle,
  ListChecks,
  Play,
  RotateCcw,
  Tags,
  UserRound,
  X
} from "lucide-react";
import { parseTaskDescription } from "../model/task.description";
import {
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
  onStatusChange: (id: string, status: TaskStatus) => Promise<void>;
  task: Task | null;
};

export function TaskDetailsPanel({
  activeTaskId,
  isBusy,
  onArchive,
  onClose,
  onStatusChange,
  task
}: TaskDetailsPanelProps) {
  if (!task) {
    return (
      <aside className="task-details-panel panel" aria-label="Detalhes do card">
        <div className="task-details-empty">
          <span className="task-details-empty-kicker">Painel do card</span>
          <h2>Abra um card para revisar contexto, sinais visuais e ações rápidas</h2>
          <p>
            O objetivo aqui é aproximar a experiência de board profissional: leitura do card,
            responsáveis, prazo, labels, checklist e próximos passos sem sair da tela principal.
          </p>
        </div>
      </aside>
    );
  }

  const description = parseTaskDescription(task.description);
  const checklistTotal = description.checklist.length;
  const isTaskBusy = activeTaskId === task.id;
  const actions = getTaskPanelActions(task);

  return (
    <aside className="task-details-panel panel" aria-label={`Detalhes da tarefa ${task.title}`}>
      <div className="task-details-head">
        <div>
          <span className="task-details-kicker">{formatTaskCode(task.id)}</span>
          <h2>{task.title}</h2>
          <p>{describeTaskMoment(task)}</p>
        </div>
        <button
          aria-label="Fechar painel do card"
          className="ghost icon-only"
          onClick={onClose}
          type="button"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="task-details-badges">
        <span className={`task-badge task-badge--${task.status}`}>{describeTaskStatus(task)}</span>
        <span className={`task-priority task-priority--${task.priority}`}>
          {describeTaskPriority(task)}
        </span>
      </div>

      <div className="task-details-grid">
        <div className="task-details-card">
          <span>Checklist</span>
          <strong>{checklistTotal}</strong>
        </div>
        <div className="task-details-card">
          <span>Assignees</span>
          <strong>{description.assignees.length}</strong>
        </div>
        <div className="task-details-card">
          <span>Labels</span>
          <strong>{description.labels.length}</strong>
        </div>
        <div className="task-details-card">
          <span>Prioridade</span>
          <strong>{describeTaskPriority(task)}</strong>
        </div>
      </div>

      {description.summary ? (
        <section className="task-details-section">
          <header>
            <Circle size={16} aria-hidden="true" />
            <h3>Resumo</h3>
          </header>
          <p>{description.summary}</p>
        </section>
      ) : null}

      {description.assignees.length > 0 ? (
        <section className="task-details-section">
          <header>
            <UserRound size={16} aria-hidden="true" />
            <h3>Responsáveis</h3>
          </header>
          <div className="task-details-chip-row">
            {description.assignees.map((assignee) => (
              <span className="task-indicator-chip" key={`assignee-${task.id}-${assignee}`}>
                {assignee}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {description.dueDate ? (
        <section className="task-details-section">
          <header>
            <CalendarDays size={16} aria-hidden="true" />
            <h3>Prazo</h3>
          </header>
          <p>{description.dueDate}</p>
        </section>
      ) : null}

      {description.labels.length > 0 ? (
        <section className="task-details-section">
          <header>
            <Tags size={16} aria-hidden="true" />
            <h3>Labels</h3>
          </header>
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
          <header>
            <ListChecks size={16} aria-hidden="true" />
            <h3>Checklist</h3>
          </header>
          <ul className="task-details-checklist">
            {description.checklist.map((item) => (
              <li key={`${task.id}-${item}`}>
                <CheckCircle2 size={14} aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {actions.length > 0 ? (
        <div className="task-details-actions">
          {actions.map((action) => (
            <button
              className={action.tone}
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
      ) : null}
    </aside>
  );
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
