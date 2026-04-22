import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import App from "./App";
import { useTaskBoardPage } from "../features/tasks/hooks/useTaskBoardPage";
import type { Task } from "../features/tasks/model/task.types";

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

describe("App shell states", () => {
  it("shows the refreshing banner and controlled alert when the board is reloading", () => {
    mockedUseTaskBoardPage.mockReturnValue({
      activeTaskId: null,
      addTask: vi.fn(async () => false),
      archiveTask: vi.fn(async () => {}),
      changeTaskStatus: vi.fn(async () => {}),
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
      tasks: []
    });

    render(<App />);

    expect(screen.getByRole("status")).toHaveTextContent("Sincronizando board e API...");
    expect(screen.getByRole("alert")).toHaveTextContent("Falha controlada.");
  });

  it("opens and closes the create modal from the board actions", async () => {
    mockedUseTaskBoardPage.mockReturnValue({
      activeTaskId: null,
      addTask: vi.fn(async () => false),
      archiveTask: vi.fn(async () => {}),
      changeTaskStatus: vi.fn(async () => {}),
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
      tasks: []
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

  it("keeps the create modal open when task creation does not succeed", async () => {
    const addTask = vi.fn(async () => false);

    mockedUseTaskBoardPage.mockReturnValue({
      activeTaskId: null,
      addTask,
      archiveTask: vi.fn(async () => {}),
      changeTaskStatus: vi.fn(async () => {}),
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
      tasks: []
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

  it("opens the details modal and closes it when the backdrop is clicked", async () => {
    mockedUseTaskBoardPage.mockReturnValue({
      activeTaskId: null,
      addTask: vi.fn(async () => false),
      archiveTask: vi.fn(async () => {}),
      changeTaskStatus: vi.fn(async () => {}),
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
      tasks: [makeTask()]
    });

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /TB-TASK1/i }));
    expect(screen.getByRole("dialog", { name: "Detalhes da tarefa Revisar prontuário" })).toBeInTheDocument();

    await user.click(screen.getByRole("dialog", { name: "Detalhes da tarefa Revisar prontuário" }));
    expect(screen.queryByRole("dialog", { name: "Detalhes da tarefa Revisar prontuário" })).not.toBeInTheDocument();
  });
});
