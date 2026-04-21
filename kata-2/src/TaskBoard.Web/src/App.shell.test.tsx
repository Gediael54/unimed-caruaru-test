import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "./App";
import { useTaskBoard } from "./hooks/useTaskBoard";

vi.mock("./hooks/useTaskBoard", () => ({
  useTaskBoard: vi.fn()
}));

const mockedUseTaskBoard = vi.mocked(useTaskBoard);

describe("App shell states", () => {
  it("shows the refreshing banner and controlled alert when the board is reloading", () => {
    mockedUseTaskBoard.mockReturnValue({
      activeTaskId: null,
      addTask: vi.fn(async () => false),
      error: "Falha controlada.",
      filter: "all",
      hasLoaded: true,
      isLoading: true,
      isSubmitting: false,
      listLabel: "Todas as tarefas",
      markTaskAsCompleted: vi.fn(async () => {}),
      removeTask: vi.fn(async () => {}),
      setFilter: vi.fn(),
      summary: {
        total: 0,
        pending: 0,
        completed: 0
      },
      tasks: []
    });

    render(<App />);

    expect(screen.getByRole("status")).toHaveTextContent("Sincronizando tarefas...");
    expect(screen.getByRole("alert")).toHaveTextContent("Falha controlada.");
  });
});
