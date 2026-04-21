import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TaskBoardSurface } from "./TaskBoardSurface";
import { TaskComposer } from "./TaskComposer";
import type { Task } from "../types";

function makeTask(status: Task["status"]): Task {
  return {
    id: "task-1",
    title: "Revisar exame",
    status,
    createdAt: "2026-04-20T10:00:00Z",
    updatedAt: "2026-04-20T10:00:00Z"
  };
}

describe("TaskBoardSurface", () => {
  it("shows the loading state while the first batch is being fetched", () => {
    render(
      <TaskBoardSurface
        activeTaskId={null}
        count={0}
        isLoading
        listLabel="Todas as tarefas"
        onComplete={vi.fn(async () => {})}
        onDelete={vi.fn(async () => {})}
        tasks={[]}
        viewMode="list"
      />
    );

    expect(screen.getByText("Carregando tarefas...")).toBeInTheDocument();
  });

  it("renders the singular counter when only one task is shown", () => {
    render(
      <TaskBoardSurface
        activeTaskId={null}
        count={1}
        isLoading={false}
        listLabel="Todas as tarefas"
        onComplete={vi.fn(async () => {})}
        onDelete={vi.fn(async () => {})}
        tasks={[makeTask("completed")]}
        viewMode="timeline"
      />
    );

    expect(screen.getByLabelText("1 tarefa")).toHaveTextContent("1 tarefa");
    expect(screen.getByText("Fechada")).toBeInTheDocument();
    expect(screen.getByText("Saiu do fluxo")).toBeInTheDocument();
  });

  it("renders the focus board with separated pending and completed sections", () => {
    render(
      <TaskBoardSurface
        activeTaskId={null}
        count={2}
        isLoading={false}
        listLabel="Todas as tarefas"
        onComplete={vi.fn(async () => {})}
        onDelete={vi.fn(async () => {})}
        tasks={[makeTask("pending"), makeTask("completed")]}
        viewMode="focus"
      />
    );

    expect(screen.getByRole("heading", { name: "Pendências que pedem ação" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Últimas concluídas" })).toBeInTheDocument();
    expect(screen.queryByText("Board em colunas com leitura de operação")).not.toBeInTheDocument();
    expect(screen.getByText("Mesa de foco para o que pede ação agora")).toBeInTheDocument();
  });

  it("shows the completed empty state inside the focus board", () => {
    render(
      <TaskBoardSurface
        activeTaskId={null}
        count={1}
        isLoading={false}
        listLabel="Tarefas pendentes"
        onComplete={vi.fn(async () => {})}
        onDelete={vi.fn(async () => {})}
        tasks={[makeTask("pending")]}
        viewMode="focus"
      />
    );

    expect(screen.getByText("Nenhuma tarefa concluída neste recorte.")).toBeInTheDocument();
  });

  it("shows the pending empty state inside the focus board", () => {
    render(
      <TaskBoardSurface
        activeTaskId={null}
        count={1}
        isLoading={false}
        listLabel="Tarefas concluídas"
        onComplete={vi.fn(async () => {})}
        onDelete={vi.fn(async () => {})}
        tasks={[makeTask("completed")]}
        viewMode="focus"
      />
    );

    expect(screen.getByText("Nenhuma tarefa pendente neste recorte.")).toBeInTheDocument();
  });

  it("shows task badges and compact task codes on cards", () => {
    render(
      <TaskBoardSurface
        activeTaskId={null}
        count={1}
        isLoading={false}
        listLabel="Todas as tarefas"
        onComplete={vi.fn(async () => {})}
        onDelete={vi.fn(async () => {})}
        tasks={[makeTask("pending")]}
        viewMode="kanban"
      />
    );

    expect(screen.getByText("Em aberto")).toBeInTheDocument();
    expect(screen.getByText("Na fila de execução")).toBeInTheDocument();
    expect(screen.getByText("TB-TASK1")).toBeInTheDocument();
  });
});

describe("TaskComposer", () => {
  it("keeps the typed value when the task is not created", async () => {
    const onSubmit = vi.fn(async () => false);
    const user = userEvent.setup();

    render(<TaskComposer disabled={false} onSubmit={onSubmit} />);

    const input = screen.getByLabelText("Nova tarefa");
    await user.type(input, "Validar contrato");
    await user.click(screen.getByRole("button", { name: "Adicionar" }));

    expect(onSubmit).toHaveBeenCalledWith("Validar contrato");
    expect(input).toHaveValue("Validar contrato");
  });
});
