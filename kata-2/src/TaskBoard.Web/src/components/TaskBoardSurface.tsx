import type { ReactNode } from "react";
import { CheckCircle2, Circle, Clock, Inbox, Trash2 } from "lucide-react";
import {
  buildTaskBuckets,
  describeTaskMoment,
  formatTaskCode,
  getViewDescription,
  sortTasksByRecentActivity,
  type TaskViewMode
} from "../task-board";
import type { Task } from "../types";

type TaskBoardSurfaceProps = {
  activeTaskId: string | null;
  count: number;
  isLoading: boolean;
  listLabel: string;
  onComplete: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  tasks: Task[];
  viewMode: TaskViewMode;
};

type TaskCardProps = {
  activeTaskId: string | null;
  isLoading: boolean;
  onComplete: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  task: Task;
  timeLabel?: string;
  variant?: "default" | "stacked" | "timeline";
};

type RendererProps = Omit<TaskBoardSurfaceProps, "count" | "listLabel" | "viewMode">;

type Renderer = (props: RendererProps) => ReactNode;

const boardSurfaceCopy: Record<
  TaskViewMode,
  { badge: string; title: string; note: string }
> = {
  list: {
    badge: "Fluxo linear",
    title: "Lista enxuta para conferência e ação",
    note: "Boa para quem quer bater o olho e agir sem mudar de contexto."
  },
  kanban: {
    badge: "Quadro operacional",
    title: "Board em colunas com leitura de operação",
    note: "As colunas deixam o fluxo visível com a cara de produto interno da Unimed."
  },
  timeline: {
    badge: "Movimento recente",
    title: "Linha do tempo do que acabou de acontecer",
    note: "Ajuda a perceber o ritmo do quadro sem perder o contexto das tarefas."
  },
  focus: {
    badge: "Leitura executiva",
    title: "Mesa de foco para o que pede ação agora",
    note: "Separa o que precisa de atenção imediata do que já saiu da fila do dia."
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
  isLoading,
  listLabel,
  onComplete,
  onDelete,
  tasks,
  viewMode
}: TaskBoardSurfaceProps) {
  const surfaceCopy = boardSurfaceCopy[viewMode];

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
          <p>Os indicadores acima continuam considerando todas as tarefas cadastradas.</p>
        </div>
        <span className="count-pill" aria-label={`${count} ${count === 1 ? "tarefa" : "tarefas"}`}>
          {count} {count === 1 ? "tarefa" : "tarefas"}
        </span>
      </div>

      {renderCollectionState(isLoading, tasks.length)}

      {tasks.length > 0
        ? renderers[viewMode]({
            activeTaskId,
            isLoading,
            onComplete,
            onDelete,
            tasks
          })
        : null}
    </section>
  );
}

function renderCollectionState(isLoading: boolean, count: number) {
  if (isLoading && count === 0) {
    return (
      <section className="task-list" aria-live="polite">
        <div className="loading-state">
          <span className="spinner" aria-hidden="true" />
          <span>Carregando tarefas...</span>
        </div>
      </section>
    );
  }

  if (!isLoading && count === 0) {
    return (
      <section className="task-list" aria-live="polite">
        <div className="empty-state">
          <span className="empty-icon" aria-hidden="true">
            <Inbox size={24} />
          </span>
          <strong>Nenhuma tarefa por aqui</strong>
          <span>Crie uma nova tarefa ou altere o filtro para ver outros itens.</span>
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
  const [pendingBucket, completedBucket] = buildTaskBuckets(
    sortTasksByRecentActivity(props.tasks)
  );

  return (
    <section className="focus-board" aria-label="Quadro em foco" aria-live="polite">
      <section className="focus-panel panel focus-panel--pending">
        <header className="focus-panel-header">
          <div>
            <span className="focus-kicker">Em foco agora</span>
            <h3>Pendências que pedem ação</h3>
            <p>Tarefas pendentes ordenadas pela atividade mais recente.</p>
          </div>
          <span className="count-pill">{pendingBucket.tasks.length}</span>
        </header>

        <div className="focus-panel-body">
          {pendingBucket.tasks.length === 0 ? (
            <div className="kanban-empty">{pendingBucket.emptyCopy}</div>
          ) : (
            pendingBucket.tasks.map((task) => (
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
            <span className="focus-kicker">Fechamentos recentes</span>
            <h3>Últimas concluídas</h3>
            <p>Ajuda a ler rapidamente o que acabou de sair do quadro.</p>
          </div>
          <span className="count-pill">{completedBucket.tasks.length}</span>
        </header>

        <div className="focus-panel-body">
          {completedBucket.tasks.length === 0 ? (
            <div className="kanban-empty">{completedBucket.emptyCopy}</div>
          ) : (
            completedBucket.tasks.map((task) => (
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
        <p>A ordenação considera a última atualização de cada tarefa.</p>
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
  onComplete,
  onDelete,
  task,
  timeLabel,
  variant = "default"
}: TaskCardProps) {
  const isCompleted = task.status === "completed";
  const isTaskBusy = activeTaskId === task.id;
  const variantClass = variant === "default" ? "" : ` task-item--${variant}`;
  const badgeLabel = isCompleted ? "Fechada" : "Em aberto";
  const stateLabel = isCompleted ? "Saiu do fluxo" : "Na fila de execução";

  return (
    <article className={`task-item${isCompleted ? " is-completed" : ""}${variantClass}`}>
      <span className="task-status-icon" aria-hidden="true">
        {isCompleted ? <CheckCircle2 size={20} /> : <Circle size={20} />}
      </span>
      <div className="task-body">
        <div className="task-card-top">
          <span className={`task-badge${isCompleted ? " is-completed" : ""}`}>
            {badgeLabel}
          </span>
          <span className="task-code">{formatTaskCode(task.id)}</span>
        </div>
        <p className="task-title">{task.title}</p>
        <div className="task-meta-row">
          <span className={`task-status-text${isCompleted ? " is-completed" : ""}`}>
            {isCompleted ? (
              <CheckCircle2 size={12} aria-hidden="true" />
            ) : (
              <Clock size={12} aria-hidden="true" />
            )}
            {stateLabel}
          </span>
          {timeLabel ? <span className="task-time">{timeLabel}</span> : null}
        </div>
      </div>
      <div className="task-actions">
        {!isCompleted ? (
          <button
            disabled={isLoading || isTaskBusy}
            onClick={() => void onComplete(task.id)}
            type="button"
          >
            <CheckCircle2 size={16} aria-hidden="true" />
            {isTaskBusy ? "Concluindo..." : "Concluir"}
          </button>
        ) : null}
        <button
          aria-label={`Remover tarefa ${task.title}`}
          className="danger"
          disabled={isLoading || isTaskBusy}
          onClick={() => void onDelete(task.id)}
          type="button"
        >
          <Trash2 size={16} aria-hidden="true" />
          {isTaskBusy ? "Removendo..." : "Remover"}
        </button>
      </div>
    </article>
  );
}
