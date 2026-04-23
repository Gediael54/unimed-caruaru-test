import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TaskDetailsPanel } from "./TaskDetailsPanel";
import type { Task } from "../model/task.types";

function makeTask(status: Task["status"], description: string | null = [
  "Resumo do card",
  "Responsável: Ana, Bruno",
  "Prazo: 25/04/2026",
  "Labels: ux, board",
  "Checklist:",
  "- [x] Validar navegação",
  "- Revisar resposta visual"
].join("\n")): Task {
  return {
    id: "task-42",
    title: "Ajustar fluxo do board",
    description,
    priority: "high",
    status,
    createdAt: "2026-04-20T10:00:00Z",
    updatedAt: "2026-04-20T10:00:00Z",
    archivedAt: status === "archived" ? "2026-04-20T11:00:00Z" : null
  };
}

describe("TaskDetailsPanel", () => {
  it("renders nothing when no card is selected", () => {
    const { container } = render(
      <TaskDetailsPanel
        activeTaskId={null}
        isBusy={false}
        onArchive={vi.fn(async () => {})}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onStatusChange={vi.fn(async () => {})}
        task={null}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders card metadata and triggers status transition from the details panel", async () => {
    const onStatusChange = vi.fn(async () => {});
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <TaskDetailsPanel
        activeTaskId={null}
        isBusy={false}
        onArchive={vi.fn(async () => {})}
        onClose={onClose}
        onEdit={vi.fn()}
        onStatusChange={onStatusChange}
        task={makeTask("pending")}
      />
    );

    expect(screen.getByText("Resumo do card")).toBeInTheDocument();
    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.getByText("Bruno")).toBeInTheDocument();
    expect(screen.getByText("ux")).toBeInTheDocument();
    expect(screen.getByText("board")).toBeInTheDocument();
    expect(screen.getByText("Validar navegação")).toBeInTheDocument();
    expect(screen.getByText("Revisar resposta visual")).toBeInTheDocument();
    expect(screen.getByText("1/2 concluídos")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Iniciar card" }));
    await user.click(screen.getByRole("button", { name: "Fechar painel do card" }));

    expect(onStatusChange).toHaveBeenCalledWith("task-42", "in_progress");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders minimal cards without optional metadata sections", () => {
    render(
      <TaskDetailsPanel
        activeTaskId={null}
        isBusy={false}
        onArchive={vi.fn(async () => {})}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onStatusChange={vi.fn(async () => {})}
        task={makeTask("pending", null)}
      />
    );

    expect(screen.getByRole("heading", { name: "Ajustar fluxo do board" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Resumo" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Responsáveis" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Prazo" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Labels" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Checklist" })).not.toBeInTheDocument();
  });

  it("supports conclude, cancel and archive actions for cards in progress", async () => {
    const onStatusChange = vi.fn(async () => {});
    const onArchive = vi.fn(async () => {});
    const user = userEvent.setup();

    render(
      <TaskDetailsPanel
        activeTaskId={null}
        isBusy={false}
        onArchive={onArchive}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onStatusChange={onStatusChange}
        task={makeTask("in_progress")}
      />
    );

    await user.click(screen.getByRole("button", { name: "Concluir" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    await user.click(screen.getByRole("button", { name: "Arquivar" }));

    expect(onStatusChange).toHaveBeenNthCalledWith(1, "task-42", "completed");
    expect(onStatusChange).toHaveBeenNthCalledWith(2, "task-42", "cancelled");
    expect(onArchive).toHaveBeenCalledWith("task-42");
  });

  it("supports reopening completed and cancelled cards", async () => {
    const onStatusChange = vi.fn(async () => {});
    const user = userEvent.setup();
    const { rerender } = render(
      <TaskDetailsPanel
        activeTaskId={null}
        isBusy={false}
        onArchive={vi.fn(async () => {})}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onStatusChange={onStatusChange}
        task={makeTask("completed")}
      />
    );

    await user.click(screen.getByRole("button", { name: "Reabrir" }));

    rerender(
      <TaskDetailsPanel
        activeTaskId={null}
        isBusy={false}
        onArchive={vi.fn(async () => {})}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onStatusChange={onStatusChange}
        task={makeTask("cancelled")}
      />
    );

    await user.click(screen.getByRole("button", { name: "Reabrir" }));

    expect(onStatusChange).toHaveBeenNthCalledWith(1, "task-42", "pending");
    expect(onStatusChange).toHaveBeenNthCalledWith(2, "task-42", "pending");
  });

  it("shows busy labels and disables actions while a card mutation is in flight", () => {
    render(
      <TaskDetailsPanel
        activeTaskId="task-42"
        isBusy
        onArchive={vi.fn(async () => {})}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onStatusChange={vi.fn(async () => {})}
        task={makeTask("pending")}
      />
    );

    expect(screen.getAllByRole("button", { name: "Movendo..." })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Movendo..." })[0]).toBeDisabled();
    expect(screen.getAllByRole("button", { name: "Movendo..." })[1]).toBeDisabled();
    expect(screen.getByRole("button", { name: "Arquivando..." })).toBeDisabled();
  });

  it("hides action buttons when the selected card is archived", () => {
    render(
      <TaskDetailsPanel
        activeTaskId={null}
        isBusy={false}
        onArchive={vi.fn(async () => {})}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onStatusChange={vi.fn(async () => {})}
        task={makeTask("archived")}
      />
    );

    expect(screen.getByRole("heading", { name: "Ajustar fluxo do board" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Arquivar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reabrir" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Iniciar card" })).not.toBeInTheDocument();
  });
});
