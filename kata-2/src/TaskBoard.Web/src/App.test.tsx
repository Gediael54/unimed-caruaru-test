import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { completeTask, createTask, deleteTask, listTasks } from "./api";
import type { Task, TaskStatus } from "./types";

vi.mock("./api", () => ({
  listTasks: vi.fn(),
  createTask: vi.fn(),
  completeTask: vi.fn(),
  deleteTask: vi.fn()
}));

function makeTask(id: string, title: string, status: TaskStatus): Task {
  return {
    id,
    title,
    status,
    createdAt: "2026-04-20T10:00:00Z",
    updatedAt: "2026-04-20T10:00:00Z"
  };
}

const mockedListTasks = vi.mocked(listTasks);
const mockedCreateTask = vi.mocked(createTask);
const mockedCompleteTask = vi.mocked(completeTask);
const mockedDeleteTask = vi.mocked(deleteTask);

describe("App", () => {
  beforeEach(() => {
    mockedListTasks.mockReset();
    mockedCreateTask.mockReset();
    mockedCompleteTask.mockReset();
    mockedDeleteTask.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("loads tasks and refetches when the user changes the status filter", async () => {
    const pendingTask = makeTask("task-1", "Ligar para paciente", "pending");
    const completedTask = makeTask("task-2", "Fechar atendimento", "completed");

    mockedListTasks.mockImplementation(async (status) => {
      if (status === "pending") {
        return [pendingTask];
      }

      if (status === "completed") {
        return [completedTask];
      }

      return [pendingTask, completedTask];
    });

    const user = userEvent.setup();
    render(<App />);
    const summary = screen.getByLabelText("Resumo das tarefas");

    expect(await screen.findByText("Ligar para paciente")).toBeInTheDocument();
    expect(await screen.findByText("Fechar atendimento")).toBeInTheDocument();
    expect(mockedListTasks).toHaveBeenCalledWith("all");
    expect(within(summary).getByText("2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Pendentes" }));
    await waitFor(() =>
      expect(
        mockedListTasks.mock.calls.some(([status]) => status === "pending")
      ).toBe(true)
    );
    await waitFor(() =>
      expect(screen.queryByText("Fechar atendimento")).not.toBeInTheDocument()
    );
    expect(screen.getByText("Ligar para paciente")).toBeInTheDocument();
    expect(screen.getByText("Os indicadores acima continuam considerando todas as tarefas cadastradas.")).toBeInTheDocument();
    expect(within(summary).getByText("2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Concluídas" }));
    await waitFor(() =>
      expect(
        mockedListTasks.mock.calls.some(([status]) => status === "completed")
      ).toBe(true)
    );
    await waitFor(() =>
      expect(screen.queryByText("Ligar para paciente")).not.toBeInTheDocument()
    );
    expect(screen.getByText("Fechar atendimento")).toBeInTheDocument();
    expect(within(summary).getByText("2")).toBeInTheDocument();
  });

  it("switches between list, kanban, timeline and focus visualizations", async () => {
    const pendingTask = makeTask("task-1", "Ligar para paciente", "pending");
    const completedTask = makeTask("task-2", "Fechar atendimento", "completed");

    mockedListTasks.mockResolvedValue([pendingTask, completedTask]);

    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByText("Ligar para paciente")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Kanban" }));
    expect(screen.getByRole("heading", { name: "Pendentes" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Concluídas" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Timeline" }));
    expect(screen.getByRole("heading", { name: "Atividade mais recente" })).toBeInTheDocument();
    expect(screen.getByText("A ordenação considera a última atualização de cada tarefa.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Em foco" }));
    expect(screen.getByRole("heading", { name: "Pendências que pedem ação" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Últimas concluídas" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Lista" }));
    expect(screen.getByRole("heading", { name: "Todas as tarefas" })).toBeInTheDocument();
  });

  it("creates, completes and removes a task using the API client", async () => {
    const pendingTask = makeTask("task-1", "Revisar contrato", "pending");
    const completedTask = { ...pendingTask, status: "completed" as const };

    mockedListTasks
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([pendingTask])
      .mockResolvedValueOnce([completedTask])
      .mockResolvedValueOnce([]);
    mockedCreateTask.mockResolvedValue(pendingTask);
    mockedCompleteTask.mockResolvedValue(completedTask);
    mockedDeleteTask.mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByText("Nenhuma tarefa por aqui")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Nova tarefa"), "  Revisar contrato  ");
    await user.click(screen.getByRole("button", { name: "Adicionar" }));

    await waitFor(() => expect(mockedCreateTask).toHaveBeenCalledWith("Revisar contrato"));
    expect(await screen.findByText("Revisar contrato")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Kanban" }));

    await user.click(screen.getByRole("button", { name: "Concluir" }));
    await waitFor(() => expect(mockedCompleteTask).toHaveBeenCalledWith("task-1"));
    expect(await screen.findByText("Fechada")).toBeInTheDocument();
    expect(screen.getByText("Saiu do fluxo")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remover tarefa Revisar contrato" }));
    await waitFor(() => expect(mockedDeleteTask).toHaveBeenCalledWith("task-1"));
    expect(await screen.findByText("Nenhuma tarefa por aqui")).toBeInTheDocument();
  });

  it("shows a controlled error when the first load fails", async () => {
    mockedListTasks.mockRejectedValueOnce(new Error("Falha ao carregar tarefas."));

    render(<App />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Falha ao carregar tarefas.");
  });
});
