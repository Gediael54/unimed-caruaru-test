import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TaskBoardSurface } from "./TaskBoardSurface";
import { TaskComposer } from "./TaskComposer";
import type { Task } from "../model/task.types";

function makeTask(status: Task["status"], priority: Task["priority"] = "medium"): Task {
  return {
    id: "task-1",
    title: "Revisar exame",
    description: "Confirmar cobertura e anexos",
    priority,
    status,
    createdAt: "2026-04-20T10:00:00Z",
    updatedAt: "2026-04-20T10:00:00Z",
    archivedAt: status === "archived" ? "2026-04-20T11:00:00Z" : null
  };
}

describe("TaskBoardSurface", () => {
  it("shows the loading state while the first batch is being fetched", () => {
    render(
      <TaskBoardSurface
        activeTaskId={null}
        count={0}
        currentFilter="all"
        isLoading
        listLabel="Todas as tarefas ativas"
        onArchive={vi.fn(async () => {})}
        onStatusChange={vi.fn(async () => {})}
        tasks={[]}
        viewMode="list"
      />
    );

    expect(screen.getByText("Carregando cards do board...")).toBeInTheDocument();
  });

  it("renders the singular counter and priority badge on cards", () => {
    render(
      <TaskBoardSurface
        activeTaskId={null}
        count={1}
        currentFilter="all"
        isLoading={false}
        listLabel="Todas as tarefas ativas"
        onArchive={vi.fn(async () => {})}
        onStatusChange={vi.fn(async () => {})}
        tasks={[makeTask("completed", "high")]}
        viewMode="timeline"
      />
    );

    expect(screen.getByLabelText("1 tarefa")).toHaveTextContent("1 tarefa");
    expect(screen.getByText("Concluída")).toBeInTheDocument();
    expect(screen.getByText("Alta")).toBeInTheDocument();
    expect(screen.getByText("Entrega concluída")).toBeInTheDocument();
  });

  it("renders the focus board with active and closed sections", () => {
    render(
      <TaskBoardSurface
        activeTaskId={null}
        count={2}
        currentFilter="all"
        isLoading={false}
        listLabel="Todas as tarefas ativas"
        onArchive={vi.fn(async () => {})}
        onStatusChange={vi.fn(async () => {})}
        tasks={[makeTask("in_progress"), makeTask("completed")]}
        viewMode="focus"
      />
    );

    expect(screen.getByRole("heading", { name: "Fila ativa do workspace" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Concluídas e canceladas" })).toBeInTheDocument();
  });

  it("shows archive specific copy when the archived filter is active", () => {
    render(
      <TaskBoardSurface
        activeTaskId={null}
        count={1}
        currentFilter="archived"
        isLoading={false}
        listLabel="Tarefas arquivadas"
        onArchive={vi.fn(async () => {})}
        onStatusChange={vi.fn(async () => {})}
        tasks={[makeTask("archived")]}
        viewMode="kanban"
      />
    );

    expect(screen.getByText("Esta visão mostra cards fora do board ativo, preservados para histórico.")).toBeInTheDocument();
    expect(screen.getByText("Arquivada")).toBeInTheDocument();
    expect(screen.getByText("Fora do board ativo")).toBeInTheDocument();
  });

  it("shows the archived empty state copy when there are no archived cards", () => {
    render(
      <TaskBoardSurface
        activeTaskId={null}
        count={0}
        currentFilter="archived"
        isLoading={false}
        listLabel="Tarefas arquivadas"
        onArchive={vi.fn(async () => {})}
        onStatusChange={vi.fn(async () => {})}
        tasks={[]}
        viewMode="kanban"
      />
    );

    expect(screen.getByText("Nenhum card arquivado neste workspace.")).toBeInTheDocument();
  });

  it("offers a create action inside the board header and empty state", async () => {
    const onCreateTask = vi.fn();
    const user = userEvent.setup();

    const { rerender } = render(
      <TaskBoardSurface
        activeTaskId={null}
        count={1}
        currentFilter="all"
        isLoading={false}
        listLabel="Todas as tarefas ativas"
        onArchive={vi.fn(async () => {})}
        onCreateTask={onCreateTask}
        onStatusChange={vi.fn(async () => {})}
        tasks={[makeTask("pending")]}
        viewMode="kanban"
      />
    );

    await user.click(screen.getByRole("button", { name: "Novo card" }));

    rerender(
      <TaskBoardSurface
        activeTaskId={null}
        count={0}
        currentFilter="all"
        isLoading={false}
        listLabel="Todas as tarefas ativas"
        onArchive={vi.fn(async () => {})}
        onCreateTask={onCreateTask}
        onStatusChange={vi.fn(async () => {})}
        tasks={[]}
        viewMode="kanban"
      />
    );

    await user.click(screen.getByRole("button", { name: "Criar primeiro card" }));

    expect(onCreateTask).toHaveBeenCalledTimes(2);
  });

  it("triggers status change and archive actions", async () => {
    const onStatusChange = vi.fn(async () => {});
    const onArchive = vi.fn(async () => {});
    const user = userEvent.setup();

    render(
      <TaskBoardSurface
        activeTaskId={null}
        count={1}
        currentFilter="all"
        isLoading={false}
        listLabel="Tarefas pendentes"
        onArchive={onArchive}
        onStatusChange={onStatusChange}
        tasks={[makeTask("pending")]}
        viewMode="list"
      />
    );

    await user.click(screen.getByRole("button", { name: "Iniciar" }));
    await user.click(screen.getByRole("button", { name: "Arquivar tarefa Revisar exame" }));

    expect(onStatusChange).toHaveBeenCalledWith("task-1", "in_progress");
    expect(onArchive).toHaveBeenCalledWith("task-1");
  });

  it("turns Trello-like description markers into indicators on the card", () => {
    render(
      <TaskBoardSurface
        activeTaskId={null}
        count={1}
        currentFilter="all"
        isLoading={false}
        listLabel="Todas as tarefas ativas"
        onArchive={vi.fn(async () => {})}
        onStatusChange={vi.fn(async () => {})}
        tasks={[
          {
            ...makeTask("pending"),
            description: [
              "Contexto operacional do card",
              "Responsável: Ana, Bruno",
              "Prazo: 25/04/2026",
              "Labels: jurídico, aprovação",
              "Checklist:",
              "- Validar contrato",
              "- Anexar evidências"
            ].join("\n")
          }
        ]}
        viewMode="list"
      />
    );

    expect(screen.getByText("Prazo: 25/04/2026")).toBeInTheDocument();
    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.getByText("Bruno")).toBeInTheDocument();
    expect(screen.getByText("jurídico")).toBeInTheDocument();
    expect(screen.getByText("aprovação")).toBeInTheDocument();
    expect(screen.getByText("Validar contrato")).toBeInTheDocument();
    expect(screen.getByText("Anexar evidências")).toBeInTheDocument();
    expect(screen.getByText("Contexto operacional do card")).toBeInTheDocument();
  });

  it("shows empty buckets in focus mode when the current slice has no active or closed cards", () => {
    render(
      <TaskBoardSurface
        activeTaskId={null}
        count={1}
        currentFilter="all"
        isLoading={false}
        listLabel="Todas as tarefas ativas"
        onArchive={vi.fn(async () => {})}
        onStatusChange={vi.fn(async () => {})}
        tasks={[makeTask("archived")]}
        viewMode="focus"
      />
    );

    expect(screen.getByText("Nenhum card exigindo ação imediata neste recorte.")).toBeInTheDocument();
    expect(screen.getByText("Nenhum fechamento recente neste recorte.")).toBeInTheDocument();
  });

  it("shows the checklist overflow indicator when a card has more than three items", () => {
    render(
      <TaskBoardSurface
        activeTaskId={null}
        count={1}
        currentFilter="all"
        isLoading={false}
        listLabel="Todas as tarefas ativas"
        onArchive={vi.fn(async () => {})}
        onStatusChange={vi.fn(async () => {})}
        tasks={[
          {
            ...makeTask("pending"),
            description: [
              "Checklist:",
              "- Item 1",
              "- Item 2",
              "- Item 3",
              "- Item 4"
            ].join("\n")
          }
        ]}
        viewMode="list"
      />
    );

    expect(screen.getByText("+1 itens")).toBeInTheDocument();
  });

  it("supports selecting cards by click and keyboard, including the selected visual state", async () => {
    const onSelectTask = vi.fn();
    const user = userEvent.setup();

    render(
      <TaskBoardSurface
        activeTaskId={null}
        count={1}
        currentFilter="all"
        isLoading={false}
        listLabel="Todas as tarefas ativas"
        onArchive={vi.fn(async () => {})}
        onSelectTask={onSelectTask}
        onStatusChange={vi.fn(async () => {})}
        selectedTaskId="task-1"
        tasks={[makeTask("pending")]}
        viewMode="list"
      />
    );

    const card = screen.getByText("Revisar exame").closest("article");
    expect(card).not.toBeNull();
    expect(card).toHaveClass("task-item--selected");
    expect(card).toHaveAttribute("role", "button");
    expect(card).toHaveAttribute("tabindex", "0");

    await user.click(card as HTMLElement);
    fireEvent.keyDown(card as HTMLElement, { key: "Enter" });
    fireEvent.keyDown(card as HTMLElement, { key: " " });
    fireEvent.keyDown(card as HTMLElement, { key: "Escape" });

    expect(onSelectTask).toHaveBeenCalledTimes(3);
    expect(onSelectTask).toHaveBeenNthCalledWith(1, expect.objectContaining({ id: "task-1" }));
  });

  it("renders cards without selection semantics when no selection handler is provided", () => {
    render(
      <TaskBoardSurface
        activeTaskId={null}
        count={1}
        currentFilter="all"
        isLoading={false}
        listLabel="Todas as tarefas ativas"
        onArchive={vi.fn(async () => {})}
        onStatusChange={vi.fn(async () => {})}
        tasks={[makeTask("pending")]}
        viewMode="list"
      />
    );

    const card = screen.getByText("Revisar exame").closest("article");
    expect(card).not.toBeNull();
    expect(card).not.toHaveAttribute("role");
    expect(card).not.toHaveAttribute("tabindex");
  });
});

describe("TaskComposer", () => {
  it("keeps the typed values when the card is not created", async () => {
    const onSubmit = vi.fn(async () => false);
    const user = userEvent.setup();

    render(<TaskComposer disabled={false} onSubmit={onSubmit} />);

    const title = screen.getByLabelText("Título");
    const description = screen.getByLabelText("Descrição");
    const priority = screen.getByLabelText("Prioridade");

    await user.type(title, "Validar contrato");
    await user.type(description, "Checar riscos jurídicos");
    await user.selectOptions(priority, "high");
    await user.click(screen.getByRole("button", { name: "Criar card" }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: "Validar contrato",
      description: "Checar riscos jurídicos",
      priority: "high"
    });
    expect(title).toHaveValue("Validar contrato");
    expect(description).toHaveValue("Checar riscos jurídicos");
  });

  it("shows description tools and updates the preview while the user types", async () => {
    const user = userEvent.setup();

    render(<TaskComposer disabled={false} onSubmit={vi.fn(async () => false)} />);

    expect(screen.getByLabelText("Ferramentas da descrição")).toBeInTheDocument();
    expect(screen.getByText("Responsável:")).toBeInTheDocument();
    expect(screen.getByText("Prazo:")).toBeInTheDocument();
    expect(screen.getByText("Labels:")).toBeInTheDocument();
    expect(screen.getByText("Checklist:")).toBeInTheDocument();
    expect(screen.getByText("Nenhuma ferramenta detectada ainda. Use os marcadores acima para enriquecer o card.")).toBeInTheDocument();

    await user.type(
      screen.getByLabelText("Descrição"),
      [
        "Resumo do card",
        "Responsável: Ana, Bruno",
        "Prazo: 25/04/2026",
        "Labels: jurídico, aprovação",
        "Checklist:",
        "- Validar contrato",
        "- Anexar evidências"
      ].join("\n")
    );

    const preview = screen.getByLabelText("Prévia dos indicadores da descrição");
    expect(within(preview).getByText("Ana, Bruno")).toBeInTheDocument();
    expect(within(preview).getByText("25/04/2026")).toBeInTheDocument();
    expect(within(preview).getByText("2 detectadas")).toBeInTheDocument();
    expect(within(preview).getByText("2 itens")).toBeInTheDocument();
    expect(within(preview).getByText("Resumo do card")).toBeInTheDocument();
    expect(within(preview).getByText("jurídico")).toBeInTheDocument();
    expect(within(preview).getByText("aprovação")).toBeInTheDocument();
    expect(within(preview).getByText("Validar contrato")).toBeInTheDocument();
    expect(within(preview).getByText("Anexar evidências")).toBeInTheDocument();
  });

  it("keeps the preview without summary text and shows checklist overflow when needed", async () => {
    const user = userEvent.setup();

    render(<TaskComposer disabled={false} onSubmit={vi.fn(async () => false)} />);

    await user.type(
      screen.getByLabelText("Descrição"),
      [
        "Responsável: Ana",
        "Checklist:",
        "- Item 1",
        "- Item 2",
        "- Item 3",
        "- Item 4"
      ].join("\n")
    );

    const preview = screen.getByLabelText("Prévia dos indicadores da descrição");

    expect(within(preview).getByText("Ana")).toBeInTheDocument();
    expect(within(preview).getByText("4 itens")).toBeInTheDocument();
    expect(within(preview).queryByText("Responsável: Ana")).not.toBeInTheDocument();
    expect(within(preview).queryByText(/^Resumo do card$/)).not.toBeInTheDocument();
    expect(within(preview).getByText("+1 itens")).toBeInTheDocument();
  });
});
