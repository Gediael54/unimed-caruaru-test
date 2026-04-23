import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import {
  archiveTask,
  createTask,
  listTasks,
  updateTask
} from "../features/tasks/api/task.service";
import type { Task, TaskPriority, TaskStatus } from "../features/tasks/model/task.types";

vi.mock("../features/tasks/api/task.service", () => ({
  listTasks: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  archiveTask: vi.fn()
}));

function makeTask(
  id: string,
  title: string,
  status: TaskStatus,
  priority: TaskPriority = "medium",
  description: string | null = null
): Task {
  return {
    id,
    title,
    description,
    priority,
    status,
    createdAt: "2026-04-20T10:00:00Z",
    updatedAt: "2026-04-20T10:00:00Z",
    archivedAt: status === "archived" ? "2026-04-20T11:00:00Z" : null
  };
}

const mockedListTasks = vi.mocked(listTasks);
const mockedCreateTask = vi.mocked(createTask);
const mockedUpdateTask = vi.mocked(updateTask);
const mockedArchiveTask = vi.mocked(archiveTask);

describe("App", () => {
  beforeEach(() => {
    mockedListTasks.mockReset();
    mockedCreateTask.mockReset();
    mockedUpdateTask.mockReset();
    mockedArchiveTask.mockReset();
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("loads tasks and refetches when the user changes the status filter", async () => {
    const pendingTask = makeTask("task-1", "Ligar para paciente", "pending", "high");
    const inProgressTask = makeTask("task-2", "Atualizar relatório", "in_progress");
    const cancelledTask = makeTask("task-3", "Cancelar agenda", "cancelled");

    mockedListTasks.mockImplementation(async (status) => {
      if (status === "pending") {
        return [pendingTask];
      }

      if (status === "in_progress") {
        return [inProgressTask];
      }

      if (status === "cancelled") {
        return [cancelledTask];
      }

      return [pendingTask, inProgressTask, cancelledTask];
    });

    const user = userEvent.setup();
    render(<App />);
    const summary = screen.getByLabelText("Resumo das tarefas");

    expect(await screen.findByText("Ligar para paciente")).toBeInTheDocument();
    expect(await screen.findByText("Atualizar relatório")).toBeInTheDocument();
    expect(mockedListTasks).toHaveBeenCalledWith("all");
    expect(within(summary).getByText("3")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Em andamento" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Lista" }));
    expect(screen.getByRole("button", { name: "Em andamento" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Em andamento" }));
    await waitFor(() =>
      expect(
        mockedListTasks.mock.calls.some(([status]) => status === "in_progress")
      ).toBe(true)
    );
    await waitFor(() =>
      expect(screen.queryByText("Ligar para paciente")).not.toBeInTheDocument()
    );
    expect(screen.getByText("Atualizar relatório")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Tarefas em andamento" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Canceladas" }));
    await waitFor(() =>
      expect(mockedListTasks.mock.calls.some(([status]) => status === "cancelled")).toBe(true)
    );
    expect(screen.getByText("Cancelar agenda")).toBeInTheDocument();
  }, 10000);

  it("switches between list, kanban, timeline and focus visualizations", async () => {
    const pendingTask = makeTask("task-1", "Ligar para paciente", "pending");
    const completedTask = makeTask("task-2", "Fechar atendimento", "completed");

    mockedListTasks.mockResolvedValue([pendingTask, completedTask]);

    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByText("Ligar para paciente")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Todas as tarefas ativas" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pendente" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Concluída" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pendentes" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Kanban" }));
    expect(screen.getByRole("heading", { name: "Pendente" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Concluída" })).toBeInTheDocument();
    expect(screen.getByRole("note", { name: "Fluxo completo do kanban" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Timeline" }));
    expect(screen.getByRole("heading", { name: "Atividade mais recente" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pendentes" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Em foco" }));
    expect(screen.getByRole("heading", { name: "Fila ativa do workspace" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Concluídas e canceladas" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Lista" }));
    expect(screen.getByRole("heading", { name: "Todas as tarefas ativas" })).toBeInTheDocument();
  });

  it("opens the selected card in the details panel and allows closing it", async () => {
    mockedListTasks.mockResolvedValue([
      makeTask(
        "task-1",
        "Revisar prontuário",
        "pending",
        "high",
        [
          "Revisar documentação antes da reunião",
          "Responsável: Ana, Bruno",
          "Labels: jurídico, operação",
          "Checklist:",
          "- Validar documento"
        ].join("\n")
      )
    ]);

    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByText("Revisar prontuário")).toBeInTheDocument();

    expect(screen.queryByRole("dialog", { name: "Detalhes da tarefa Revisar prontuário" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /TB-TASK1/i }));

    const detailsDialog = screen.getByRole("dialog", { name: "Detalhes da tarefa Revisar prontuário" });
    const detailsPanel = within(detailsDialog).getByLabelText("Detalhes da tarefa Revisar prontuário");

    expect(within(detailsPanel).getByRole("heading", { name: "Revisar prontuário" })).toBeInTheDocument();
    expect(within(detailsPanel).getByText("Ana")).toBeInTheDocument();
    expect(within(detailsPanel).getByText("Bruno")).toBeInTheDocument();
    expect(within(detailsPanel).getByText("jurídico")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Fechar painel do card" }));

    expect(screen.queryByRole("dialog", { name: "Detalhes da tarefa Revisar prontuário" })).not.toBeInTheDocument();
  });

  it("creates, moves and archives a card using the API client", async () => {
    const pendingTask = makeTask(
      "task-1",
      "Revisar contrato",
      "pending",
      "high",
      "Validar cláusulas"
    );
    const inProgressTask = { ...pendingTask, status: "in_progress" as const };

    mockedListTasks
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([pendingTask])
      .mockResolvedValueOnce([inProgressTask])
      .mockResolvedValueOnce([]);
    mockedCreateTask.mockResolvedValue(pendingTask);
    mockedUpdateTask.mockResolvedValue(inProgressTask);
    mockedArchiveTask.mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByText("Nenhum card por aqui")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Criar primeiro card" }));

    expect(screen.getByRole("dialog", { name: "Criar novo card" })).toBeInTheDocument();

    await user.type(screen.getByLabelText("Título"), "  Revisar contrato  ");
    await user.type(screen.getByLabelText("Descrição"), " Validar cláusulas ");
    await user.selectOptions(screen.getByLabelText("Prioridade"), "high");
    await user.click(screen.getByRole("button", { name: "Criar card" }));

    await waitFor(() =>
      expect(mockedCreateTask).toHaveBeenCalledWith({
        title: "Revisar contrato",
        description: "Validar cláusulas",
        priority: "high"
      })
    );
    expect(await screen.findByText("Revisar contrato")).toBeInTheDocument();
    expect(screen.getByText("Validar cláusulas")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Criar novo card" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Kanban" }));
    await user.click(screen.getByRole("button", { name: "Iniciar" }));
    await waitFor(() =>
      expect(mockedUpdateTask).toHaveBeenCalledWith("task-1", { status: "in_progress" })
    );
    expect(await screen.findByText("Em execução")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Arquivar tarefa Revisar contrato" }));
    await waitFor(() => expect(mockedArchiveTask).toHaveBeenCalledWith("task-1"));
    expect(await screen.findByText("Nenhum card por aqui")).toBeInTheDocument();
  }, 10_000);

  it("shows a controlled error when the first load fails", async () => {
    mockedListTasks.mockRejectedValueOnce(new Error("Falha ao carregar o board."));

    render(<App />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Falha ao carregar o board.");
  });
});
