import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { archiveTask, createTask, listTasks, updateTask } from "../api/task.service";
import { useTaskBoardPage } from "./useTaskBoardPage";
import type { Task, TaskPriority, TaskStatus } from "../model/task.types";

vi.mock("../api/task.service", () => ({
  listTasks: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  archiveTask: vi.fn()
}));

function makeTask(
  id: string,
  title: string,
  status: TaskStatus,
  priority: TaskPriority = "medium"
): Task {
  return {
    id,
    title,
    description: null,
    priority,
    status,
    createdAt: "2026-04-20T10:00:00Z",
    updatedAt: "2026-04-20T10:00:00Z",
    archivedAt: status === "archived" ? "2026-04-20T11:00:00Z" : null
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const mockedListTasks = vi.mocked(listTasks);
const mockedCreateTask = vi.mocked(createTask);
const mockedUpdateTask = vi.mocked(updateTask);
const mockedArchiveTask = vi.mocked(archiveTask);

describe("useTaskBoardPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows a validation error when the user submits a blank title", async () => {
    mockedListTasks.mockResolvedValue([]);

    const { result } = renderHook(() => useTaskBoardPage());
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));

    await act(async () => {
      expect(
        await result.current.addTask({
          title: "   ",
          description: "",
          priority: "medium"
        })
      ).toBe(false);
    });

    expect(result.current.error).toBe("Informe um título para a tarefa.");
  });

  it("creates cards with description and priority", async () => {
    mockedListTasks.mockResolvedValue([]);
    mockedCreateTask.mockResolvedValue(makeTask("task-1", "Nova tarefa", "pending", "high"));

    const { result } = renderHook(() => useTaskBoardPage());
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));

    await act(async () => {
      expect(
        await result.current.addTask({
          title: "  Nova tarefa  ",
          description: "  Contexto  ",
          priority: "high"
        })
      ).toBe(true);
    });

    expect(mockedCreateTask).toHaveBeenCalledWith({
      title: "Nova tarefa",
      description: "Contexto",
      priority: "high"
    });
  });

  it("falls back to the default create error message for non-Error rejections", async () => {
    mockedListTasks.mockResolvedValue([]);
    mockedCreateTask.mockRejectedValue("network");

    const { result } = renderHook(() => useTaskBoardPage());
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));

    await act(async () => {
      expect(
        await result.current.addTask({
          title: "Nova tarefa",
          description: "",
          priority: "medium"
        })
      ).toBe(false);
    });

    expect(result.current.error).toBe("Não foi possível criar a tarefa.");
    expect(result.current.isSubmitting).toBe(false);
  });

  it("falls back to the default status change error message for non-Error rejections", async () => {
    const task = makeTask("task-1", "Nova tarefa", "pending");
    mockedListTasks.mockResolvedValue([task]);
    mockedUpdateTask.mockRejectedValue("network");

    const { result } = renderHook(() => useTaskBoardPage());
    await waitFor(() => expect(result.current.tasks).toEqual([task]));

    await act(async () => {
      await result.current.changeTaskStatus("task-1", "completed");
    });

    expect(result.current.error).toBe("Não foi possível atualizar a tarefa.");
    expect(result.current.activeTaskId).toBeNull();
    expect(result.current.isSubmitting).toBe(false);
  });

  it("falls back to the default archive error message for non-Error rejections", async () => {
    const task = makeTask("task-1", "Nova tarefa", "pending");
    mockedListTasks.mockResolvedValue([task]);
    mockedArchiveTask.mockRejectedValue("network");

    const { result } = renderHook(() => useTaskBoardPage());
    await waitFor(() => expect(result.current.tasks).toEqual([task]));

    await act(async () => {
      await result.current.archiveTask("task-1");
    });

    expect(result.current.error).toBe("Não foi possível arquivar a tarefa.");
    expect(result.current.activeTaskId).toBeNull();
    expect(result.current.isSubmitting).toBe(false);
  });

  it("ignores stale successful loads when a newer filter request wins", async () => {
    const stale = deferred<Task[]>();
    const activeTask = makeTask("task-1", "Revisar exame", "in_progress", "high");

    mockedListTasks
      .mockImplementationOnce(() => stale.promise)
      .mockResolvedValueOnce([activeTask])
      .mockResolvedValueOnce([activeTask]);

    const { result } = renderHook(() => useTaskBoardPage());
    await waitFor(() => expect(mockedListTasks).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.setFilter("in_progress");
    });

    await waitFor(() => expect(mockedListTasks).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(result.current.tasks).toEqual([activeTask]));
    expect(result.current.summary.inProgress).toBe(1);

    await act(async () => {
      stale.resolve([makeTask("stale", "Resposta antiga", "completed")]);
      await Promise.resolve();
    });

    expect(result.current.tasks).toEqual([activeTask]);
    expect(result.current.summary.inProgress).toBe(1);
  });

  it("ignores stale failed loads when a newer filter request wins", async () => {
    const stale = deferred<Task[]>();
    const pendingTask = makeTask("task-1", "Revisar exame", "pending");

    mockedListTasks
      .mockImplementationOnce(() => stale.promise)
      .mockResolvedValueOnce([pendingTask])
      .mockResolvedValueOnce([pendingTask]);

    const { result } = renderHook(() => useTaskBoardPage());
    await waitFor(() => expect(mockedListTasks).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.setFilter("pending");
    });

    await waitFor(() => expect(result.current.tasks).toEqual([pendingTask]));

    await act(async () => {
      stale.reject("stale failure");
      await Promise.resolve();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("falls back to the filtered slice when the summary snapshot is unavailable", async () => {
    const pendingTask = makeTask("task-1", "Revisar exame", "pending", "high");

    mockedListTasks
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([pendingTask])
      .mockResolvedValueOnce(undefined as unknown as Task[]);

    const { result } = renderHook(() => useTaskBoardPage());
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));

    act(() => {
      result.current.setFilter("pending");
    });

    await waitFor(() => expect(result.current.filter).toBe("pending"));
    await waitFor(() => expect(result.current.tasks).toEqual([pendingTask]));

    expect(result.current.summary).toEqual({
      total: 1,
      pending: 1,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
      highPriority: 1
    });
  });

  it("updates card details and refreshes the current board slice", async () => {
    const originalTask = makeTask("task-1", "Review board flow", "pending", "high");
    const updatedTask = { ...originalTask, title: "Review board flow updated" };

    mockedListTasks
      .mockResolvedValueOnce([originalTask])
      .mockResolvedValueOnce([updatedTask]);
    mockedUpdateTask.mockResolvedValue(updatedTask);

    const { result } = renderHook(() => useTaskBoardPage());
    await waitFor(() => expect(result.current.tasks).toEqual([originalTask]));

    await act(async () => {
      expect(
        await result.current.updateTask("task-1", {
          title: "Review board flow updated"
        })
      ).toBe(true);
    });

    expect(mockedUpdateTask).toHaveBeenCalledWith("task-1", {
      title: "Review board flow updated"
    });
    expect(result.current.tasks).toEqual([updatedTask]);
    expect(result.current.activeTaskId).toBeNull();
    expect(result.current.isSubmitting).toBe(false);
  });

  it("falls back to the default edit error message for non-Error rejections", async () => {
    const task = makeTask("task-1", "Review board flow", "pending");
    mockedListTasks.mockResolvedValue([task]);
    mockedUpdateTask.mockRejectedValue("network");

    const { result } = renderHook(() => useTaskBoardPage());
    await waitFor(() => expect(result.current.tasks).toEqual([task]));

    await act(async () => {
      expect(
        await result.current.updateTask("task-1", {
          title: "Review board flow updated"
        })
      ).toBe(false);
    });

    expect(result.current.error).toBe("Não foi possível salvar o card.");
    expect(result.current.activeTaskId).toBeNull();
    expect(result.current.isSubmitting).toBe(false);
  });
});
