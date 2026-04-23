import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TaskBoardSurface } from "./TaskBoardSurface";
import { TaskComposer } from "./TaskComposer";
import { TaskFilters } from "./TaskFilters";
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

function createDataTransfer(): DataTransfer {
  const store = new Map<string, string>();

  return {
    dropEffect: "move",
    effectAllowed: "all",
    clearData: vi.fn((format?: string) => {
      if (format) {
        store.delete(format);
        return;
      }
      store.clear();
    }),
    files: [] as unknown as FileList,
    getData: vi.fn((format: string) => store.get(format) ?? ""),
    items: [] as unknown as DataTransferItemList,
    setData: vi.fn((format: string, value: string) => {
      store.set(format, value);
    }),
    setDragImage: vi.fn(),
    types: []
  } as unknown as DataTransfer;
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

  it("offers a create action in the empty state when there are no cards", async () => {
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

    expect(onCreateTask).toHaveBeenCalledTimes(1);
  });

  it("triggers primary, secondary and archive actions from the card footer", async () => {
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
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    await user.click(screen.getByRole("button", { name: "Arquivar tarefa Revisar exame" }));

    expect(onStatusChange).toHaveBeenCalledWith("task-1", "in_progress");
    expect(onStatusChange).toHaveBeenCalledWith("task-1", "cancelled");
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
              "- [x] Validar contrato",
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
    expect(screen.getByText("1/2 concluídos")).toBeInTheDocument();
    expect(screen.getByText("Contexto operacional do card")).toBeInTheDocument();
  });

  it("renders metadata chips without forcing a checklist section", () => {
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
              "Responsável: Ana",
              "Prazo: 25/04/2026",
              "Labels: jurídico"
            ].join("\n")
          }
        ]}
        viewMode="list"
      />
    );

    expect(screen.getByText("Prazo: 25/04/2026")).toBeInTheDocument();
    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.getByText("jurídico")).toBeInTheDocument();
    expect(screen.queryByLabelText("Checklist resumido do card")).not.toBeInTheDocument();
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

  it("uses the singular checklist label when the card has only one item", () => {
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
            description: ["Checklist:", "- Confirmar assinatura"].join("\n")
          }
        ]}
        viewMode="list"
      />
    );

    expect(screen.getByText("0/1 concluído")).toBeInTheDocument();
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
    expect(card).toHaveClass("task-card--selected");
    expect(card).toHaveAttribute("role", "button");
    expect(card).toHaveAttribute("tabindex", "0");

    await user.click(card as HTMLElement);
    fireEvent.keyDown(card as HTMLElement, { key: "Enter" });
    fireEvent.keyDown(card as HTMLElement, { key: " " });
    fireEvent.keyDown(card as HTMLElement, { key: "Escape" });

    expect(onSelectTask).toHaveBeenCalledTimes(3);
    expect(onSelectTask).toHaveBeenNthCalledWith(1, expect.objectContaining({ id: "task-1" }));
  });

  it("moves a card to another kanban column by drag and drop", () => {
    const onStatusChange = vi.fn(async () => {});
    const dataTransfer = createDataTransfer();

    render(
      <TaskBoardSurface
        activeTaskId={null}
        count={1}
        currentFilter="all"
        isLoading={false}
        listLabel="Todas as tarefas ativas"
        onArchive={vi.fn(async () => {})}
        onStatusChange={onStatusChange}
        tasks={[makeTask("pending")]}
        viewMode="kanban"
      />
    );

    const card = screen.getByText("Revisar exame").closest("article");
    const targetColumn = screen.getByRole("heading", { name: "Em andamento" }).closest("section");

    expect(card).not.toBeNull();
    expect(targetColumn).not.toBeNull();

    fireEvent.dragStart(card as HTMLElement, { dataTransfer });

    expect(card).toHaveClass("task-card--dragging");
    expect(targetColumn).toHaveClass("kanban-column--droppable");

    fireEvent.dragEnter(targetColumn as HTMLElement, { dataTransfer });
    fireEvent.dragOver(targetColumn as HTMLElement, { dataTransfer });

    expect(targetColumn).toHaveClass("kanban-column--drag-over");

    fireEvent.drop(targetColumn as HTMLElement, { dataTransfer });

    expect(onStatusChange).toHaveBeenCalledWith("task-1", "in_progress");
    expect(card).not.toHaveClass("task-card--dragging");
    expect(targetColumn).not.toHaveClass("kanban-column--drag-over");
  });

  it("ignores drag and drop when the card is dropped into the same kanban column", () => {
    const onStatusChange = vi.fn(async () => {});
    const dataTransfer = createDataTransfer();

    render(
      <TaskBoardSurface
        activeTaskId={null}
        count={1}
        currentFilter="all"
        isLoading={false}
        listLabel="Todas as tarefas ativas"
        onArchive={vi.fn(async () => {})}
        onStatusChange={onStatusChange}
        tasks={[makeTask("pending")]}
        viewMode="kanban"
      />
    );

    const card = screen.getByText("Revisar exame").closest("article");
    const sameColumn = screen.getByRole("heading", { name: "Pendente" }).closest("section");

    expect(card).not.toBeNull();
    expect(sameColumn).not.toBeNull();

    fireEvent.dragStart(card as HTMLElement, { dataTransfer });
    fireEvent.dragOver(sameColumn as HTMLElement, { dataTransfer });
    fireEvent.drop(sameColumn as HTMLElement, { dataTransfer });
    fireEvent.dragEnd(card as HTMLElement);

    expect(sameColumn).not.toHaveClass("kanban-column--drag-over");
    expect(onStatusChange).not.toHaveBeenCalled();
    expect(card).not.toHaveClass("task-card--dragging");
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

describe("TaskFilters", () => {
  it("does not render a status filter group in the kanban view", () => {
    render(
      <TaskFilters
        currentFilter="all"
        disabled={false}
        onChange={vi.fn()}
        viewMode="kanban"
      />
    );

    expect(screen.queryByRole("group", { name: "Filtros de tarefas" })).not.toBeInTheDocument();
  });

  it("keeps the current filter visible when the focus view excludes it from the default set", () => {
    render(
      <TaskFilters
        currentFilter="archived"
        disabled={false}
        onChange={vi.fn()}
        viewMode="focus"
      />
    );

    expect(screen.getByRole("button", { name: "Arquivadas" })).toBeInTheDocument();
  });
});

describe("TaskComposer", () => {
  it("shows the title error inside the composer and clears it after typing", async () => {
    const onSubmit = vi.fn(async () => false);
    const user = userEvent.setup();

    render(<TaskComposer disabled={false} onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Criar card" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Informe um título antes de criar o card.");

    await user.type(screen.getByLabelText("Título"), "Planejar reunião");

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps the typed values when the card is not created", async () => {
    const onSubmit = vi.fn(async () => false);
    const user = userEvent.setup();

    render(<TaskComposer disabled={false} onSubmit={onSubmit} />);

    const title = screen.getByLabelText("Título");
    const description = screen.getByLabelText("Descrição");
    const assignees = screen.getByLabelText("Responsáveis");
    const dueDate = screen.getByLabelText("Prazo");
    const labels = screen.getByLabelText("Labels");
    const checklist = screen.getByLabelText("Checklist");
    const priority = screen.getByLabelText("Prioridade");

    await user.type(title, "Validar contrato");
    await user.type(description, "Checar riscos jurídicos");
    await user.type(assignees, "Ana, Bruno");
    fireEvent.change(dueDate, { target: { value: "2026-04-25" } });
    await user.type(labels, "jurídico, aprovação");
    fireEvent.change(checklist, {
      target: { value: "[x] Validar contrato\nRevisar pendências" }
    });
    await user.selectOptions(priority, "high");
    await user.click(screen.getByRole("button", { name: "Criar card" }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: "Validar contrato",
      description: [
        "Checar riscos jurídicos",
        "Responsável: Ana, Bruno",
        "Prazo: 25/04/2026",
        "Labels: jurídico, aprovação",
        "Checklist:",
        "- [x] Validar contrato",
        "- Revisar pendências"
      ].join("\n"),
      priority: "high"
    });
    expect(title).toHaveValue("Validar contrato");
    expect(description).toHaveValue("Checar riscos jurídicos");
    expect(assignees).toHaveValue("Ana, Bruno");
    expect(dueDate).toHaveValue("2026-04-25");
    expect(labels).toHaveValue("jurídico, aprovação");
    expect(checklist).toHaveValue("[x] Validar contrato\nRevisar pendências");
  });

  it("clears the form after the card is created successfully", async () => {
    const onSubmit = vi.fn(async () => true);
    const user = userEvent.setup();

    render(<TaskComposer disabled={false} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Título"), "Planejar sprint");
    await user.type(screen.getByLabelText("Descrição"), "Alinhar prioridades");
    await user.type(screen.getByLabelText("Checklist"), "Item 1");
    await user.selectOptions(screen.getByLabelText("Prioridade"), "high");
    await user.click(screen.getByRole("button", { name: "Criar card" }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: "Planejar sprint",
      description: ["Alinhar prioridades", "Checklist:", "- Item 1"].join("\n"),
      priority: "high"
    });
    expect(screen.getByLabelText("Título")).toHaveValue("");
    expect(screen.getByLabelText("Descrição")).toHaveValue("");
    expect(screen.getByLabelText("Responsáveis")).toHaveValue("");
    expect(screen.getByLabelText("Prazo")).toHaveValue("");
    expect(screen.getByLabelText("Labels")).toHaveValue("");
    expect(screen.getByLabelText("Checklist")).toHaveValue("");
    expect(screen.getByLabelText("Prioridade")).toHaveValue("medium");
  });

  it("hydrates editor fields when an existing card is passed in edit mode", () => {
    render(
      <TaskComposer
        disabled={false}
        initialTask={{
          ...makeTask("pending"),
          title: "Ajustar fluxo",
          priority: "high",
          description: [
            "Resumo do card",
            "Responsável: Ana, Bruno",
            "Prazo: 25/04/2026",
            "Labels: jurídico, aprovação",
            "Checklist:",
            "- [x] Validar contrato",
            "- Anexar evidências"
          ].join("\n")
        }}
        mode="edit"
        onSubmit={vi.fn(async () => true)}
      />
    );

    expect(screen.getByLabelText("Título")).toHaveValue("Ajustar fluxo");
    expect(screen.getByLabelText("Descrição")).toHaveValue("Resumo do card");
    expect(screen.getByLabelText("Responsáveis")).toHaveValue("Ana, Bruno");
    expect(screen.getByLabelText("Prazo")).toHaveValue("2026-04-25");
    expect(screen.getByLabelText("Labels")).toHaveValue("jurídico, aprovação");
    expect(screen.getByLabelText("Checklist")).toHaveValue("[x] Validar contrato\n[ ] Anexar evidências");
    expect(screen.getByRole("button", { name: "Salvar card" })).toBeInTheDocument();
  });

  it("renders a live preview once the structured fields are filled", async () => {
    const user = userEvent.setup();

    render(<TaskComposer disabled={false} onSubmit={vi.fn(async () => false)} />);

    expect(screen.queryByLabelText("Prévia do card")).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Descrição"), "Resumo do card");
    await user.type(screen.getByLabelText("Responsáveis"), "Ana, Bruno");
    fireEvent.change(screen.getByLabelText("Prazo"), { target: { value: "2026-04-25" } });
    await user.type(screen.getByLabelText("Labels"), "jurídico, aprovação");
    fireEvent.change(screen.getByLabelText("Checklist"), {
      target: { value: "[x] Validar contrato\nAnexar evidências" }
    });

    const preview = screen.getByLabelText("Prévia do card");
    expect(within(preview).getByText("Resumo do card")).toBeInTheDocument();
    expect(within(preview).getByText("Ana, Bruno")).toBeInTheDocument();
    expect(within(preview).getByText("25/04/2026")).toBeInTheDocument();
    expect(within(preview).getByText("1/2 concluídos")).toBeInTheDocument();
    expect(within(preview).getByText("jurídico")).toBeInTheDocument();
    expect(within(preview).getByText("aprovação")).toBeInTheDocument();
  });

  it("renders a checklist summary without listing each item", async () => {
    const user = userEvent.setup();

    render(<TaskComposer disabled={false} onSubmit={vi.fn(async () => false)} />);

    await user.type(screen.getByLabelText("Responsáveis"), "Ana");
    await user.type(screen.getByLabelText("Labels"), "contrato");
    await user.type(screen.getByLabelText("Checklist"), "Item 1\nItem 2\nItem 3\nItem 4");

    const preview = screen.getByLabelText("Prévia do card");

    expect(within(preview).getByText("Ana")).toBeInTheDocument();
    expect(within(preview).getByText("0/4 concluídos")).toBeInTheDocument();
    expect(within(preview).queryByText("Item 1")).not.toBeInTheDocument();
  });

  it("renders the preview even when only deadline and labels are present", async () => {
    const user = userEvent.setup();

    render(<TaskComposer disabled={false} onSubmit={vi.fn(async () => false)} />);

    fireEvent.change(screen.getByLabelText("Prazo"), { target: { value: "2026-04-25" } });
    await user.type(screen.getByLabelText("Labels"), "operação");

    const preview = screen.getByLabelText("Prévia do card");

    expect(within(preview).getByText("25/04/2026")).toBeInTheDocument();
    expect(within(preview).getByText("operação")).toBeInTheDocument();
    expect(within(preview).queryByText("Responsáveis")).not.toBeInTheDocument();
  });
});
