import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { useTaskBoardPage } from "../features/tasks/hooks/useTaskBoardPage";
import type { Task, TaskFilter } from "../features/tasks/model/task.types";

vi.mock("../features/tasks/hooks/useTaskBoardPage", () => ({
  useTaskBoardPage: vi.fn()
}));

const mockedUseTaskBoardPage = vi.mocked(useTaskBoardPage);

function makeTask(): Task {
  return {
    id: "task-1",
    title: "Revisar prontuário",
    description: "Contexto do card",
    priority: "high",
    status: "pending",
    createdAt: "2026-04-20T10:00:00Z",
    updatedAt: "2026-04-20T10:00:00Z",
    archivedAt: null
  };
}

function makeStructuredTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-structured",
    title: "Refinar fluxo do board",
    description: [
      "Detalhamento do card",
      "Responsável: Ana, Bruno",
      "Prazo: 25/04/2026",
      "Labels: board, ux",
      "Checklist:",
      "- [x] Revisar fluxo",
      "- Validar feedback"
    ].join("\n"),
    priority: "high",
    status: "pending",
    createdAt: "2026-04-20T10:00:00Z",
    updatedAt: "2026-04-20T10:00:00Z",
    archivedAt: null,
    ...overrides
  };
}

describe("App shell states", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.useRealTimers();
  });

  it("shows the refreshing banner and controlled alert when the board is reloading", () => {
    mockedUseTaskBoardPage.mockReturnValue({
      activeTaskId: null,
      addTask: vi.fn(async () => false),
      archiveTask: vi.fn(async () => true),
      changeTaskStatus: vi.fn(async () => true),
      error: "Falha controlada.",
      filter: "all",
      hasLoaded: true,
      isBusy: true,
      isLoading: true,
      isSubmitting: false,
      listLabel: "Todas as tarefas ativas",
      setFilter: vi.fn(),
      summary: {
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
        cancelled: 0,
        highPriority: 0
      },
      tasks: [],
      updateTask: vi.fn(async () => true)
    });

    render(<App />);

    expect(screen.getByRole("status")).toHaveTextContent("Sincronizando board e API...");
    expect(screen.getByRole("alert")).toHaveTextContent("Falha controlada.");
  });

  it("opens and closes the create modal from the board actions", async () => {
    mockedUseTaskBoardPage.mockReturnValue({
      activeTaskId: null,
      addTask: vi.fn(async () => false),
      archiveTask: vi.fn(async () => true),
      changeTaskStatus: vi.fn(async () => true),
      error: null,
      filter: "all",
      hasLoaded: true,
      isBusy: false,
      isLoading: false,
      isSubmitting: false,
      listLabel: "Todas as tarefas ativas",
      setFilter: vi.fn(),
      summary: {
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
        cancelled: 0,
        highPriority: 0
      },
      tasks: [],
      updateTask: vi.fn(async () => true)
    });

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Criar primeiro card" }));
    expect(screen.getByRole("dialog", { name: "Criar novo card" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Fechar modal de criação" }));
    expect(screen.queryByRole("dialog", { name: "Criar novo card" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Criar primeiro card" }));
    await user.click(screen.getByRole("dialog", { name: "Criar novo card" }));

    expect(screen.queryByRole("dialog", { name: "Criar novo card" })).not.toBeInTheDocument();
  });

  it("opens the create modal from the primary header action", async () => {
    mockedUseTaskBoardPage.mockReturnValue({
      activeTaskId: null,
      addTask: vi.fn(async () => false),
      archiveTask: vi.fn(async () => true),
      changeTaskStatus: vi.fn(async () => true),
      error: null,
      filter: "all",
      hasLoaded: true,
      isBusy: false,
      isLoading: false,
      isSubmitting: false,
      listLabel: "Todas as tarefas ativas",
      setFilter: vi.fn(),
      summary: {
        total: 1,
        pending: 1,
        inProgress: 0,
        completed: 0,
        cancelled: 0,
        highPriority: 1
      },
      tasks: [makeTask()],
      updateTask: vi.fn(async () => true)
    });

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Novo card" }));

    expect(screen.getByRole("dialog", { name: "Criar novo card" })).toBeInTheDocument();
  });

  it("keeps the create modal open when task creation does not succeed", async () => {
    const addTask = vi.fn(async () => false);

    mockedUseTaskBoardPage.mockReturnValue({
      activeTaskId: null,
      addTask,
      archiveTask: vi.fn(async () => true),
      changeTaskStatus: vi.fn(async () => true),
      error: null,
      filter: "all",
      hasLoaded: true,
      isBusy: false,
      isLoading: false,
      isSubmitting: false,
      listLabel: "Todas as tarefas ativas",
      setFilter: vi.fn(),
      summary: {
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
        cancelled: 0,
        highPriority: 0
      },
      tasks: [],
      updateTask: vi.fn(async () => true)
    });

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Criar primeiro card" }));
    await user.type(screen.getByLabelText("Título"), "Falha controlada");
    await user.click(screen.getByRole("button", { name: "Criar card" }));

    expect(addTask).toHaveBeenCalledWith({
      title: "Falha controlada",
      description: "",
      priority: "medium"
    });
    expect(screen.getByRole("dialog", { name: "Criar novo card" })).toBeInTheDocument();
  });

  it("resets the archived filter when the user switches to the focus view", async () => {
    const setFilter = vi.fn();

    mockedUseTaskBoardPage.mockReturnValue({
      activeTaskId: null,
      addTask: vi.fn(async () => false),
      archiveTask: vi.fn(async () => true),
      changeTaskStatus: vi.fn(async () => true),
      error: null,
      filter: "archived",
      hasLoaded: true,
      isBusy: false,
      isLoading: false,
      isSubmitting: false,
      listLabel: "Tarefas arquivadas",
      setFilter,
      summary: {
        total: 1,
        pending: 0,
        inProgress: 0,
        completed: 0,
        cancelled: 0,
        highPriority: 0
      },
      tasks: [makeTask()],
      updateTask: vi.fn(async () => true)
    });

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Em foco" }));

    expect(setFilter).toHaveBeenCalledWith("all");
  });

  it("resets the active status filter when the user returns to the kanban view", async () => {
    const setFilter = vi.fn();

    mockedUseTaskBoardPage.mockReturnValue({
      activeTaskId: null,
      addTask: vi.fn(async () => false),
      archiveTask: vi.fn(async () => true),
      changeTaskStatus: vi.fn(async () => true),
      error: null,
      filter: "pending",
      hasLoaded: true,
      isBusy: false,
      isLoading: false,
      isSubmitting: false,
      listLabel: "Pendentes",
      setFilter,
      summary: {
        total: 1,
        pending: 1,
        inProgress: 0,
        completed: 0,
        cancelled: 0,
        highPriority: 0
      },
      tasks: [makeTask()],
      updateTask: vi.fn(async () => true)
    });

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Lista" }));
    expect(screen.getByRole("button", { name: "Pendentes" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Kanban" }));

    expect(setFilter).toHaveBeenCalledWith("all");
    expect(screen.queryByRole("button", { name: "Pendentes" })).not.toBeInTheDocument();
  });

  it("opens the details modal and closes it when the backdrop is clicked", async () => {
    mockedUseTaskBoardPage.mockReturnValue({
      activeTaskId: null,
      addTask: vi.fn(async () => false),
      archiveTask: vi.fn(async () => true),
      changeTaskStatus: vi.fn(async () => true),
      error: null,
      filter: "all",
      hasLoaded: true,
      isBusy: false,
      isLoading: false,
      isSubmitting: false,
      listLabel: "Todas as tarefas ativas",
      setFilter: vi.fn(),
      summary: {
        total: 1,
        pending: 1,
        inProgress: 0,
        completed: 0,
        cancelled: 0,
        highPriority: 1
      },
      tasks: [makeTask()],
      updateTask: vi.fn(async () => true)
    });

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /TB-TASK1/i }));
    expect(screen.getByRole("dialog", { name: "Detalhes da tarefa Revisar prontuário" })).toBeInTheDocument();

    await user.click(screen.getByRole("dialog", { name: "Detalhes da tarefa Revisar prontuário" }));
    expect(screen.queryByRole("dialog", { name: "Detalhes da tarefa Revisar prontuário" })).not.toBeInTheDocument();
  });

  it("opens the archived slice from the toolbar shortcut and exposes a way back to the active board", async () => {
    const boardState = {
      activeTaskId: null,
      addTask: vi.fn(async () => false),
      archiveTask: vi.fn(async () => true),
      changeTaskStatus: vi.fn(async () => true),
      error: null,
      filter: "all" as TaskFilter,
      hasLoaded: true,
      isBusy: false,
      isLoading: false,
      isSubmitting: false,
      listLabel: "Todas as tarefas ativas",
      setFilter: vi.fn((nextFilter: TaskFilter | ((previousFilter: TaskFilter) => TaskFilter)) => {
        boardState.filter =
          typeof nextFilter === "function" ? nextFilter(boardState.filter) : nextFilter;
      }),
      summary: {
        total: 1,
        pending: 1,
        inProgress: 0,
        completed: 0,
        cancelled: 0,
        highPriority: 1
      },
      tasks: [makeStructuredTask()],
      updateTask: vi.fn(async () => true)
    };

    mockedUseTaskBoardPage.mockImplementation(() => boardState);

    const user = userEvent.setup();
    const { rerender } = render(<App />);

    await user.click(screen.getByRole("button", { name: "Ver arquivados" }));

    expect(boardState.setFilter).toHaveBeenCalledWith("archived");

    rerender(<App />);

    expect(screen.getByRole("button", { name: "Voltar ao board ativo" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Voltar ao board ativo" }));

    expect(boardState.setFilter).toHaveBeenCalledWith("all");
  });

  it("filters by search, shows the empty search state and persists board preferences", async () => {
    mockedUseTaskBoardPage.mockReturnValue({
      activeTaskId: null,
      addTask: vi.fn(async () => false),
      archiveTask: vi.fn(async () => true),
      changeTaskStatus: vi.fn(async () => true),
      error: null,
      filter: "all",
      hasLoaded: true,
      isBusy: false,
      isLoading: false,
      isSubmitting: false,
      listLabel: "Todas as tarefas ativas",
      setFilter: vi.fn(),
      summary: {
        total: 2,
        pending: 1,
        inProgress: 1,
        completed: 0,
        cancelled: 0,
        highPriority: 1
      },
      tasks: [
        makeStructuredTask(),
        makeStructuredTask({
          id: "task-2",
          title: "Atualizar indicadores",
          description: "Resumo operacional",
          priority: "medium",
          status: "in_progress"
        })
      ],
      updateTask: vi.fn(async () => true)
    });

    const user = userEvent.setup();
    render(<App />);

    await user.type(
      screen.getByPlaceholderText("Buscar por título, label, responsável ou checklist"),
      "inexistente"
    );

    expect(screen.getByText("Nenhum card encontrado")).toBeInTheDocument();
    expect(
      screen.getByText("Ajuste a busca ou limpe o termo para revisar novamente o board completo.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Criar primeiro card" })).not.toBeInTheDocument();

    await user.clear(
      screen.getByPlaceholderText("Buscar por título, label, responsável ou checklist")
    );
    await user.click(screen.getByRole("button", { name: "Timeline" }));
    await user.selectOptions(screen.getByRole("combobox"), "title");

    expect(JSON.parse(window.localStorage.getItem("taskboard.preferences.v1") ?? "{}")).toMatchObject({
      searchQuery: "",
      sortMode: "title",
      viewMode: "timeline"
    });
  });

  it("shows a success toast after creating a card and closes it automatically", async () => {
    vi.useFakeTimers();

    mockedUseTaskBoardPage.mockReturnValue({
      activeTaskId: null,
      addTask: vi.fn(async () => true),
      archiveTask: vi.fn(async () => true),
      changeTaskStatus: vi.fn(async () => true),
      error: null,
      filter: "all",
      hasLoaded: true,
      isBusy: false,
      isLoading: false,
      isSubmitting: false,
      listLabel: "Todas as tarefas ativas",
      setFilter: vi.fn(),
      summary: {
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
        cancelled: 0,
        highPriority: 0
      },
      tasks: [],
      updateTask: vi.fn(async () => true)
    });

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Criar primeiro card" }));
    fireEvent.change(screen.getByLabelText("Título"), {
      target: { value: "Novo card do board" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Criar card" }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText("Card criado.")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(2800);
    });

    expect(screen.queryByText("Card criado.")).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it("opens the details modal, edits the selected card and allows closing the toast manually", async () => {
    const updateTask = vi.fn(async () => true);

    mockedUseTaskBoardPage.mockReturnValue({
      activeTaskId: null,
      addTask: vi.fn(async () => false),
      archiveTask: vi.fn(async () => true),
      changeTaskStatus: vi.fn(async () => true),
      error: null,
      filter: "all",
      hasLoaded: true,
      isBusy: false,
      isLoading: false,
      isSubmitting: false,
      listLabel: "Todas as tarefas ativas",
      setFilter: vi.fn(),
      summary: {
        total: 1,
        pending: 1,
        inProgress: 0,
        completed: 0,
        cancelled: 0,
        highPriority: 1
      },
      tasks: [makeStructuredTask()],
      updateTask
    });

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /TB-/i }));
    await user.click(screen.getByRole("button", { name: "Editar card" }));

    expect(screen.getByRole("dialog", { name: "Editar card Refinar fluxo do board" })).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Título"));
    await user.click(screen.getByRole("button", { name: "Salvar card" }));
    expect(screen.getByText("Informe um título antes de salvar o card.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Título"), "Refinar fluxo do board atualizado");
    await user.click(screen.getByRole("button", { name: "Salvar card" }));

    await waitFor(() =>
      expect(updateTask).toHaveBeenCalledWith(
        "task-structured",
        expect.objectContaining({
          title: "Refinar fluxo do board atualizado",
          priority: "high"
        })
      )
    );

    expect(await screen.findByText("Card atualizado.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Fechar aviso do board" }));
    expect(screen.queryByText("Card atualizado.")).not.toBeInTheDocument();
  });

  it("archives the selected card and shows restore feedback for archived cards", async () => {
    const archiveTask = vi.fn(async () => true);
    const changeTaskStatus = vi.fn(async () => true);

    const boardState = {
      activeTaskId: null,
      addTask: vi.fn(async () => false),
      archiveTask,
      changeTaskStatus,
      error: null,
      filter: "all" as TaskFilter,
      hasLoaded: true,
      isBusy: false,
      isLoading: false,
      isSubmitting: false,
      listLabel: "Todas as tarefas ativas",
      setFilter: vi.fn(),
      summary: {
        total: 1,
        pending: 1,
        inProgress: 0,
        completed: 0,
        cancelled: 0,
        highPriority: 1
      },
      tasks: [makeStructuredTask()],
      updateTask: vi.fn(async () => true)
    };

    mockedUseTaskBoardPage.mockImplementation(() => boardState);

    const user = userEvent.setup();
    const { rerender } = render(<App />);

    await user.click(screen.getByRole("button", { name: /TB-/i }));
    await user.click(screen.getByRole("button", { name: "Arquivar" }));

    await waitFor(() => expect(archiveTask).toHaveBeenCalledWith("task-structured"));
    expect(screen.queryByRole("dialog", { name: "Detalhes da tarefa Refinar fluxo do board" })).not.toBeInTheDocument();
    expect(await screen.findByText("Card arquivado.")).toBeInTheDocument();

    boardState.filter = "archived";
    boardState.tasks = [
      makeStructuredTask({
        status: "archived",
        archivedAt: "2026-04-20T11:00:00Z"
      })
    ];

    rerender(<App />);

    await user.click(screen.getByRole("button", { name: "Restaurar" }));

    await waitFor(() =>
      expect(changeTaskStatus).toHaveBeenCalledWith("task-structured", "pending")
    );
    expect(await screen.findByText("Card restaurado ao board.")).toBeInTheDocument();
  });

  it("closes the selected archived card details after restoring it", async () => {
    const changeTaskStatus = vi.fn(async () => true);

    mockedUseTaskBoardPage.mockReturnValue({
      activeTaskId: null,
      addTask: vi.fn(async () => false),
      archiveTask: vi.fn(async () => true),
      changeTaskStatus,
      error: null,
      filter: "archived",
      hasLoaded: true,
      isBusy: false,
      isLoading: false,
      isSubmitting: false,
      listLabel: "Tarefas arquivadas",
      setFilter: vi.fn(),
      summary: {
        total: 1,
        pending: 0,
        inProgress: 0,
        completed: 0,
        cancelled: 0,
        highPriority: 1
      },
      tasks: [
        makeStructuredTask({
          status: "archived",
          archivedAt: "2026-04-20T11:00:00Z"
        })
      ],
      updateTask: vi.fn(async () => true)
    });

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /TB-/i }));
    const detailsDialog = screen.getByRole("dialog", { name: "Detalhes da tarefa Refinar fluxo do board" });

    await user.click(within(detailsDialog).getByRole("button", { name: "Restaurar" }));

    await waitFor(() =>
      expect(changeTaskStatus).toHaveBeenCalledWith("task-structured", "pending")
    );
    expect(screen.queryByRole("dialog", { name: "Detalhes da tarefa Refinar fluxo do board" })).not.toBeInTheDocument();
  });

  it("does not show a toast when the status update fails", async () => {
    const changeTaskStatus = vi.fn(async () => false);

    mockedUseTaskBoardPage.mockReturnValue({
      activeTaskId: null,
      addTask: vi.fn(async () => false),
      archiveTask: vi.fn(async () => true),
      changeTaskStatus,
      error: null,
      filter: "all" as TaskFilter,
      hasLoaded: true,
      isBusy: false,
      isLoading: false,
      isSubmitting: false,
      listLabel: "Todas as tarefas ativas",
      setFilter: vi.fn(),
      summary: {
        total: 1,
        pending: 1,
        inProgress: 0,
        completed: 0,
        cancelled: 0,
        highPriority: 1
      },
      tasks: [makeStructuredTask()],
      updateTask: vi.fn(async () => true)
    });

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Iniciar" }));

    expect(changeTaskStatus).toHaveBeenCalledWith("task-structured", "in_progress");
    expect(screen.queryByText("Card movido para execução.")).not.toBeInTheDocument();
  });

  it("shows status feedback for moving, concluding, cancelling and reopening cards", async () => {
    const changeTaskStatus = vi.fn(async () => true);

    const boardState = {
      activeTaskId: null,
      addTask: vi.fn(async () => false),
      archiveTask: vi.fn(async () => true),
      changeTaskStatus,
      error: null,
      filter: "all" as TaskFilter,
      hasLoaded: true,
      isBusy: false,
      isLoading: false,
      isSubmitting: false,
      listLabel: "Todas as tarefas ativas",
      setFilter: vi.fn(),
      summary: {
        total: 1,
        pending: 1,
        inProgress: 0,
        completed: 0,
        cancelled: 0,
        highPriority: 1
      },
      tasks: [makeStructuredTask()],
      updateTask: vi.fn(async () => true)
    };

    mockedUseTaskBoardPage.mockImplementation(() => boardState);

    const user = userEvent.setup();
    const { rerender } = render(<App />);

    await user.click(screen.getByRole("button", { name: "Iniciar" }));
    expect(await screen.findByText("Card movido para execução.")).toBeInTheDocument();

    boardState.tasks = [makeStructuredTask({ status: "in_progress" })];
    rerender(<App />);

    await user.click(screen.getByRole("button", { name: "Concluir" }));
    expect(await screen.findByText("Card concluído.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(await screen.findByText("Card cancelado.")).toBeInTheDocument();

    boardState.tasks = [makeStructuredTask({ status: "completed" })];
    rerender(<App />);

    await user.click(screen.getByRole("button", { name: "Reabrir" }));
    expect(await screen.findByText("Card reaberto.")).toBeInTheDocument();
  });
});
