import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { BoardHeader } from "./components/BoardHeader";
import { TaskComposer } from "./components/TaskComposer";
import { TaskBoardSurface } from "./components/TaskBoardSurface";
import { TaskFilters } from "./components/TaskFilters";
import { TaskViewSwitcher } from "./components/TaskViewSwitcher";
import { useTaskBoard } from "./hooks/useTaskBoard";
import type { TaskViewMode } from "./task-board";

const filterLabels = {
  all: "Todas",
  pending: "Pendentes",
  completed: "Concluídas"
} as const;

const viewLabels = {
  list: "Lista",
  kanban: "Kanban",
  timeline: "Timeline",
  focus: "Em foco"
} as const;

function App() {
  const [viewMode, setViewMode] = useState<TaskViewMode>("kanban");
  const {
    activeTaskId,
    addTask,
    error,
    filter,
    hasLoaded,
    isLoading,
    isSubmitting,
    listLabel,
    markTaskAsCompleted,
    removeTask,
    setFilter,
    summary,
    tasks
  } = useTaskBoard();
  const completionRate = summary.total === 0 ? 0 : Math.round((summary.completed / summary.total) * 100);

  return (
    <main className="app-shell">
      <BoardHeader isRefreshing={isLoading && hasLoaded} summary={summary} />

      <TaskComposer disabled={isLoading || isSubmitting} onSubmit={addTask} />

      <section className="workspace-bar panel" aria-label="Contexto do quadro">
        <div className="workspace-copy">
          <span className="workspace-chip">Board assistencial</span>
          <h2>Quadro com leitura Trello e acabamento de produto interno</h2>
          <p>
            O estado é único. O que muda é a forma de enxergar o trabalho:
            fluxo por coluna, leitura linear, atividade recente ou mesa de foco.
          </p>
        </div>
        <div className="workspace-overview">
          <div className="workspace-pills">
            <span className="workspace-pill">Filtro ativo: {filterLabels[filter]}</span>
            <span className="workspace-pill">Vista atual: {viewLabels[viewMode]}</span>
            <span className="workspace-pill">Itens visíveis: {tasks.length}</span>
          </div>
          <div className="workspace-stats" aria-label="Resumo operacional do quadro">
            <article className="workspace-stat">
              <span>Pendentes</span>
              <strong>{summary.pending}</strong>
            </article>
            <article className="workspace-stat">
              <span>Concluídas</span>
              <strong>{summary.completed}</strong>
            </article>
            <article className="workspace-stat">
              <span>Ritmo</span>
              <strong>{completionRate}%</strong>
            </article>
          </div>
        </div>
      </section>

      <section className="toolbar-cluster" aria-label="Controles do quadro">
        <div className="toolbar-block">
          <span className="toolbar-label">Filtro</span>
          <TaskFilters
            currentFilter={filter}
            disabled={isLoading || isSubmitting}
            onChange={setFilter}
          />
        </div>
        <div className="toolbar-block">
          <span className="toolbar-label">Visualização</span>
          <TaskViewSwitcher
            currentView={viewMode}
            disabled={isLoading || isSubmitting}
            onChange={setViewMode}
          />
        </div>
      </section>

      {error ? (
        <p className="error-message" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}

      <TaskBoardSurface
        activeTaskId={activeTaskId}
        count={tasks.length}
        isLoading={isLoading}
        listLabel={listLabel}
        onComplete={markTaskAsCompleted}
        onDelete={removeTask}
        tasks={tasks}
        viewMode={viewMode}
      />
    </main>
  );
}

export default App;
