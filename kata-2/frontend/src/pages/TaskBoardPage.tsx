import { useState } from "react";
import { AlertCircle, X } from "lucide-react";
import { BoardHeader } from "../features/tasks/components/BoardHeader";
import { TaskDetailsPanel } from "../features/tasks/components/TaskDetailsPanel";
import { TaskComposer } from "../features/tasks/components/TaskComposer";
import { TaskBoardSurface } from "../features/tasks/components/TaskBoardSurface";
import { TaskFilters } from "../features/tasks/components/TaskFilters";
import { TaskViewSwitcher } from "../features/tasks/components/TaskViewSwitcher";
import { FILTER_LABELS } from "../features/tasks/model/task.constants";
import { useTaskBoardPage } from "../features/tasks/hooks/useTaskBoardPage";
import type { TaskViewMode } from "../features/tasks/model/task.types";

const viewLabels = {
  list: "Lista",
  kanban: "Kanban",
  timeline: "Timeline",
  focus: "Em foco"
} as const;

export function TaskBoardPage() {
  const [viewMode, setViewMode] = useState<TaskViewMode>("kanban");
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const board = useTaskBoardPage();
  const completionRate =
    board.summary.total === 0 ? 0 : Math.round((board.summary.completed / board.summary.total) * 100);
  const selectedTask = board.tasks.find((task) => task.id === selectedTaskId) ?? null;

  async function handleCreateTask(input: Parameters<typeof board.addTask>[0]) {
    const wasCreated = await board.addTask(input);
    if (wasCreated) {
      setIsComposerOpen(false);
    }
    return wasCreated;
  }

  return (
    <main className="workspace-shell">
      <section className="workspace-ribbon" aria-label="Resumo e ferramentas do workspace">
        <section className="workspace-sidebar-card workspace-sidebar-card--identity panel">
          <span className="workspace-sidebar-kicker">Workspace atual</span>
          <h2>Operação interna · Board principal</h2>
          <p>
            O fluxo prioriza quadro visual, leitura rápida de cards e histórico preservado. Auth,
            times e permissões ficam declarados como próxima etapa arquitetural, sem simular algo
            que ainda não existe no contrato do MVP.
          </p>
          <div className="workspace-chip-row">
            <span className="workspace-chip">Sessão local simulada</span>
            <span className="workspace-chip">Soft delete</span>
            <span className="workspace-chip">Prioridade nativa</span>
          </div>
        </section>

        <section className="workspace-sidebar-card panel" aria-label="Contexto operacional">
          <header className="workspace-sidebar-head">
            <span className="workspace-sidebar-kicker">Contexto operacional</span>
            <h3>Ferramentas do quadro, sem roubar espaço do kanban</h3>
            <p>
              Aqui ficam as ferramentas de apoio do board: filtro por status, troca de leitura
              entre lista, kanban, timeline e foco, mais os indicadores rápidos do recorte atual.
            </p>
          </header>

          <div className="workspace-metrics-grid">
            <div className="workspace-metric">
              <span>Filtro</span>
              <strong>{FILTER_LABELS[board.filter]}</strong>
            </div>
            <div className="workspace-metric">
              <span>Leitura</span>
              <strong>{viewLabels[viewMode]}</strong>
            </div>
            <div className="workspace-metric">
              <span>Visíveis</span>
              <strong>{board.tasks.length}</strong>
            </div>
            <div className="workspace-metric">
              <span>Ritmo</span>
              <strong>{completionRate}%</strong>
            </div>
          </div>

          <div className="toolbar-stack">
            <div className="toolbar-block">
              <span className="toolbar-label">Filtro do board</span>
              <TaskFilters
                currentFilter={board.filter}
                disabled={board.isBusy}
                onChange={board.setFilter}
              />
            </div>
            <div className="toolbar-block">
              <span className="toolbar-label">Visualização</span>
              <TaskViewSwitcher
                currentView={viewMode}
                disabled={board.isBusy}
                onChange={setViewMode}
              />
            </div>
          </div>
        </section>
      </section>

      <section className="workspace-main workspace-main--full">
        <BoardHeader isRefreshing={board.isLoading && board.hasLoaded} summary={board.summary} />

        <section className="board-topbar panel" aria-label="Resumo do board">
          <div className="board-topbar-copy">
            <span className="board-glance-kicker">Board em uso</span>
            <h2>Fluxo central em estilo workspace, com o kanban como leitura inicial</h2>
            <p>
              O fluxo principal concentra as ferramentas do dia a dia no próprio quadro: novo card,
              abertura de detalhes em modal, mudança rápida de status, arquivamento e leitura por
              colunas sem depender de navegação para outra página.
            </p>
          </div>
          <div className="board-glance-pills">
            <span className="board-glance-pill">Modo inicial: Kanban</span>
            <span className="board-glance-pill">Cards ativos: {board.summary.total}</span>
            <span className="board-glance-pill">Concluídas: {board.summary.completed}</span>
            <span className="board-glance-pill">
              Fluxo: criação e detalhe em modal
            </span>
          </div>
        </section>

        {board.error ? (
          <p className="error-message" role="alert">
            <AlertCircle size={18} aria-hidden="true" />
            <span>{board.error}</span>
          </p>
        ) : null}

        <div className="board-canvas">
          <TaskBoardSurface
            activeTaskId={board.activeTaskId}
            count={board.tasks.length}
            currentFilter={board.filter}
            isLoading={board.isLoading}
            listLabel={board.listLabel}
            onArchive={board.archiveTask}
            onCreateTask={() => setIsComposerOpen(true)}
            onSelectTask={(task) => setSelectedTaskId(task.id)}
            onStatusChange={board.changeTaskStatus}
            selectedTaskId={selectedTaskId}
            tasks={board.tasks}
            viewMode={viewMode}
          />
        </div>
      </section>

      {isComposerOpen ? (
        <div
          aria-label="Criar novo card"
          aria-modal="true"
          className="task-modal-backdrop"
          onClick={() => setIsComposerOpen(false)}
          role="dialog"
        >
          <div
            className="task-modal-shell task-modal-shell--composer"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="task-modal-head">
              <div>
                <span className="task-modal-kicker">Novo card</span>
                <h2>Criar card dentro do fluxo principal do board</h2>
                <p>
                  A criação sai da lateral fixa e entra em modal para deixar o quadro como foco
                  principal da navegação.
                </p>
              </div>
              <button
                aria-label="Fechar modal de criação"
                className="ghost icon-only"
                onClick={() => setIsComposerOpen(false)}
                type="button"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <TaskComposer disabled={board.isBusy} onSubmit={handleCreateTask} />
          </div>
        </div>
      ) : null}

      {selectedTask ? (
        <div
          aria-label={`Detalhes da tarefa ${selectedTask.title}`}
          aria-modal="true"
          className="task-modal-backdrop"
          onClick={() => setSelectedTaskId(null)}
          role="dialog"
        >
          <div
            className="task-modal-shell task-modal-shell--details"
            onClick={(event) => event.stopPropagation()}
          >
            <TaskDetailsPanel
              activeTaskId={board.activeTaskId}
              isBusy={board.isBusy}
              onArchive={board.archiveTask}
              onClose={() => setSelectedTaskId(null)}
              onStatusChange={board.changeTaskStatus}
              task={selectedTask}
            />
          </div>
        </div>
      ) : null}
    </main>
  );
}
