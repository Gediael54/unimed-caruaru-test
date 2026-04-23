import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowUpDown, Search, X } from "lucide-react";
import { BoardHeader } from "../features/tasks/components/BoardHeader";
import { TaskDetailsPanel } from "../features/tasks/components/TaskDetailsPanel";
import { TaskComposer } from "../features/tasks/components/TaskComposer";
import { TaskBoardSurface } from "../features/tasks/components/TaskBoardSurface";
import { TaskFilters } from "../features/tasks/components/TaskFilters";
import { TaskViewSwitcher } from "../features/tasks/components/TaskViewSwitcher";
import {
  FILTER_LABELS,
  STATUS_LABELS,
  TASK_SORT_OPTIONS,
  activeTaskStatuses
} from "../features/tasks/model/task.constants";
import {
  filterTasksByQuery,
  getViewDescription,
  sortTasks
} from "../features/tasks/model/task.selectors";
import { useTaskBoardPage } from "../features/tasks/hooks/useTaskBoardPage";
import type { TaskSortMode, TaskViewMode } from "../features/tasks/model/task.types";

type BoardPreferences = {
  searchQuery: string;
  sortMode: TaskSortMode;
  viewMode: TaskViewMode;
};

export const STORAGE_KEY = "taskboard.preferences.v1";

const viewLabels: Record<TaskViewMode, string> = {
  list: "Lista",
  kanban: "Kanban",
  timeline: "Timeline",
  focus: "Em foco"
};

const kanbanStatusLabels = activeTaskStatuses.map((status) => ({
  label: STATUS_LABELS[status],
  status
}));

const viewFilterHints: Record<TaskViewMode, string> = {
  list: "Recorte completo do conjunto para triagem direta e leitura linear.",
  kanban: "No kanban, o próprio board já segmenta o fluxo por status. O recorte aqui volta para a visão completa.",
  timeline: "O recorte continua valendo, mas a leitura passa a privilegiar atividade recente.",
  focus: "Mantém o recorte operacional e remove o histórico arquivado da visão principal."
};

export function readBoardPreferences(): BoardPreferences {
  if (typeof window === "undefined") {
    return { searchQuery: "", sortMode: "priority", viewMode: "kanban" };
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return { searchQuery: "", sortMode: "priority", viewMode: "kanban" };
    }

    const parsed = JSON.parse(rawValue) as Partial<BoardPreferences>;
    return {
      searchQuery: parsed.searchQuery ?? "",
      sortMode: parsed.sortMode ?? "priority",
      viewMode: parsed.viewMode ?? "kanban"
    };
  } catch {
    return { searchQuery: "", sortMode: "priority", viewMode: "kanban" };
  }
}

export function writeBoardPreferences(preferences: BoardPreferences) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}

export function TaskBoardPage() {
  const initialPreferences = useMemo(() => readBoardPreferences(), []);
  const [viewMode, setViewMode] = useState<TaskViewMode>(initialPreferences.viewMode);
  const [searchQuery, setSearchQuery] = useState(initialPreferences.searchQuery);
  const [sortMode, setSortMode] = useState<TaskSortMode>(initialPreferences.sortMode);
  const [composerState, setComposerState] = useState<{ open: boolean; taskId: string | null }>({
    open: false,
    taskId: null
  });
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const board = useTaskBoardPage();
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const visibleTasks = useMemo(
    () => sortTasks(filterTasksByQuery(board.tasks, deferredSearchQuery), sortMode),
    [board.tasks, deferredSearchQuery, sortMode]
  );
  const selectedTask = board.tasks.find((task) => task.id === selectedTaskId) ?? null;
  const editingTask = composerState.taskId
    ? board.tasks.find((task) => task.id === composerState.taskId) ?? null
    : null;
  const showsStatusFilters = viewMode !== "kanban";
  const activeFilterLabel = viewMode === "kanban" ? "Board completo" : FILTER_LABELS[board.filter];
  const emptyState =
    deferredSearchQuery.trim() && visibleTasks.length === 0 && board.tasks.length > 0
      ? {
          title: "Nenhum card encontrado",
          copy: "Ajuste a busca ou limpe o termo para revisar novamente o board completo.",
          hideCreateAction: true
        }
      : null;

  useEffect(() => {
    writeBoardPreferences({
      searchQuery,
      sortMode,
      viewMode
    });
  }, [searchQuery, sortMode, viewMode]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setToast(null);
    }, 2800);

    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  async function handleSaveTask(input: Parameters<typeof board.addTask>[0]) {
    const wasSaved = editingTask
      ? await board.updateTask(editingTask.id, input)
      : await board.addTask(input);

    if (wasSaved) {
      setComposerState({ open: false, taskId: null });
      setToast(editingTask ? "Card atualizado." : "Card criado.");
    }

    return wasSaved;
  }

  async function handleArchiveTask(id: string) {
    const wasArchived = await board.archiveTask(id);
    if (wasArchived) {
      if (selectedTaskId === id) {
        setSelectedTaskId(null);
      }
      setToast("Card arquivado.");
    }
  }

  async function handleStatusChange(id: string, status: Parameters<typeof board.changeTaskStatus>[1]) {
    const currentTask = board.tasks.find((task) => task.id === id);
    const wasUpdated = await board.changeTaskStatus(id, status);
    if (!wasUpdated) {
      return;
    }

    if (currentTask?.status === "archived" && status === "pending") {
      if (selectedTaskId === id) {
        setSelectedTaskId(null);
      }
      setToast("Card restaurado ao board.");
      return;
    }

    if (status === "completed") {
      setToast("Card concluído.");
      return;
    }

    if (status === "in_progress") {
      setToast("Card movido para execução.");
      return;
    }

    if (status === "cancelled") {
      setToast("Card cancelado.");
      return;
    }

    if (status === "pending") {
      setToast("Card reaberto.");
    }
  }

  function openCreateComposer() {
    setComposerState({ open: true, taskId: null });
  }

  function openEditComposer(taskId: string) {
    setSelectedTaskId(null);
    setComposerState({ open: true, taskId });
  }

  function closeComposer() {
    setComposerState({ open: false, taskId: null });
  }

  function handleChangeView(nextView: TaskViewMode) {
    setViewMode(nextView);
    if (nextView === "kanban" && board.filter !== "all") {
      board.setFilter("all");
      return;
    }
    if (nextView === "focus" && board.filter === "archived") {
      board.setFilter("all");
    }
  }

  function openArchivedView() {
    setSelectedTaskId(null);
    setViewMode("list");
    board.setFilter("archived");
  }

  function returnToActiveBoard() {
    board.setFilter("all");
  }

  return (
    <main className="board-app">
      <BoardHeader
        filterLabel={activeFilterLabel}
        isRefreshing={board.isLoading && board.hasLoaded}
        summary={board.summary}
        onCreateTask={openCreateComposer}
        viewLabel={viewLabels[viewMode]}
        visibleCount={visibleTasks.length}
      />

      <section className="board-toolbar" aria-label="Ferramentas do board">
        <div className="board-toolbar-groups">
          <div className="board-toolbar-block">
            <span className="board-toolbar-label">Filtro</span>
            <p className="board-toolbar-helper">{viewFilterHints[viewMode]}</p>
            <div className="board-toolbar-control-surface">
              {showsStatusFilters ? (
                <TaskFilters
                  currentFilter={board.filter}
                  disabled={board.isBusy}
                  onChange={board.setFilter}
                  viewMode={viewMode}
                />
              ) : (
                <div
                  aria-label="Fluxo completo do kanban"
                  className="board-toolbar-flow-state"
                  role="note"
                >
                  <span className="board-toolbar-flow-badge">Board completo</span>
                  <div className="board-toolbar-flow-track">
                    {kanbanStatusLabels.map((item) => (
                      <span
                        className={`board-toolbar-flow-chip board-toolbar-flow-chip--${item.status}`}
                        key={item.status}
                      >
                        {item.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="board-toolbar-block">
            <span className="board-toolbar-label">Visualização</span>
            <p className="board-toolbar-helper">Troque a leitura sem duplicar regras, cards ou endpoints.</p>
            <TaskViewSwitcher
              currentView={viewMode}
              disabled={board.isBusy}
              onChange={handleChangeView}
            />
          </div>

          <div className="board-toolbar-block">
            <span className="board-toolbar-label">Busca e ordem</span>
            <p className="board-toolbar-helper">Recorte local para revisar cards sem refazer a chamada da API.</p>
            <div className="board-toolbar-search-stack">
              <label className="board-toolbar-search" htmlFor="task-search">
                <Search size={14} aria-hidden="true" />
                <input
                  id="task-search"
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Buscar por título, label, responsável ou checklist"
                  type="text"
                  value={searchQuery}
                />
              </label>
              <label className="board-toolbar-sort" htmlFor="task-sort">
                <ArrowUpDown size={14} aria-hidden="true" />
                <select
                  id="task-sort"
                  onChange={(event) => setSortMode(event.target.value as TaskSortMode)}
                  value={sortMode}
                >
                  {TASK_SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>

        <div className="board-toolbar-context" aria-label="Contexto da visualização">
          <strong>{activeFilterLabel}</strong>
          <p>{getViewDescription(viewMode)}</p>
          <span className="board-toolbar-context-meta">
            {visibleTasks.length} {visibleTasks.length === 1 ? "card visível" : "cards visíveis"}
          </span>
          <div className="board-toolbar-context-actions">
            {board.filter === "archived" ? (
              <button className="ghost board-toolbar-shortcut" onClick={returnToActiveBoard} type="button">
                Voltar ao board ativo
              </button>
            ) : (
              <button className="ghost board-toolbar-shortcut" onClick={openArchivedView} type="button">
                Ver arquivados
              </button>
            )}
          </div>
        </div>
      </section>

      {board.error ? (
        <p className="board-alert" role="alert">
          <AlertCircle size={16} aria-hidden="true" />
          <span>{board.error}</span>
        </p>
      ) : null}

      {toast ? (
        <p className="board-toast" role="status">
          <span>{toast}</span>
          <button
            aria-label="Fechar aviso do board"
            className="icon-button"
            onClick={() => setToast(null)}
            type="button"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </p>
      ) : null}

      <TaskBoardSurface
        activeTaskId={board.activeTaskId}
        count={visibleTasks.length}
        currentFilter={board.filter}
        emptyState={emptyState}
        isLoading={board.isLoading}
        listLabel={board.listLabel}
        onArchive={handleArchiveTask}
        onCreateTask={openCreateComposer}
        onSelectTask={(task) => setSelectedTaskId(task.id)}
        onStatusChange={handleStatusChange}
        selectedTaskId={selectedTaskId}
        tasks={visibleTasks}
        viewMode={viewMode}
      />

      {composerState.open ? (
        <div
          aria-label={editingTask ? `Editar card ${editingTask.title}` : "Criar novo card"}
          aria-modal="true"
          className="modal-backdrop"
          onClick={closeComposer}
          role="dialog"
        >
          <div
            className="modal-shell modal-shell--composer"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="modal-head">
              <h2>{editingTask ? "Editar card" : "Novo card"}</h2>
              <button
                aria-label={editingTask ? "Fechar modal de edição" : "Fechar modal de criação"}
                className="icon-button"
                onClick={closeComposer}
                type="button"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>
            <TaskComposer
              disabled={board.isBusy}
              initialTask={editingTask}
              key={editingTask?.id ?? "create"}
              mode={editingTask ? "edit" : "create"}
              onCancel={closeComposer}
              onSubmit={handleSaveTask}
            />
          </div>
        </div>
      ) : null}

      {selectedTask ? (
        <div
          aria-label={`Detalhes da tarefa ${selectedTask.title}`}
          aria-modal="true"
          className="modal-backdrop"
          onClick={() => setSelectedTaskId(null)}
          role="dialog"
        >
          <div
            className="modal-shell modal-shell--details"
            onClick={(event) => event.stopPropagation()}
          >
            <TaskDetailsPanel
              activeTaskId={board.activeTaskId}
              isBusy={board.isBusy}
              onArchive={handleArchiveTask}
              onClose={() => setSelectedTaskId(null)}
              onEdit={() => openEditComposer(selectedTask.id)}
              onStatusChange={handleStatusChange}
              task={selectedTask}
            />
          </div>
        </div>
      ) : null}
    </main>
  );
}
