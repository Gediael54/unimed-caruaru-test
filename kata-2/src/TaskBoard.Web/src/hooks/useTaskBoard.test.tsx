import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { completeTask, createTask, deleteTask, listTasks } from "../api";
import { useTaskBoard } from "./useTaskBoard";
import type { Task, TaskStatus } from "../types";

vi.mock("../api", () => ({
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
const mockedCompleteTask = vi.mocked(completeTask);
const mockedDeleteTask = vi.mocked(deleteTask);

describe("useTaskBoard", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows a validation error when the user submits a blank title", async () => {
    mockedListTasks.mockResolvedValue([]);

    const { result } = renderHook(() => useTaskBoard());
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));

    await act(async () => {
      expect(await result.current.addTask("   ")).toBe(false);
    });

    expect(result.current.error).toBe("Informe um título para a tarefa.");
  });

  it("falls back to the default create error message for non-Error rejections", async () => {
    mockedListTasks.mockResolvedValue([]);
    mockedCreateTask.mockRejectedValue("network");

    const { result } = renderHook(() => useTaskBoard());
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));

    await act(async () => {
      expect(await result.current.addTask("Nova tarefa")).toBe(false);
    });

    expect(result.current.error).toBe("Não foi possível criar a tarefa.");
    expect(result.current.isSubmitting).toBe(false);
  });

  it("falls back to the default complete error message for non-Error rejections", async () => {
    const task = makeTask("task-1", "Nova tarefa", "pending");
    mockedListTasks.mockResolvedValue([task]);
    mockedCompleteTask.mockRejectedValue("network");

    const { result } = renderHook(() => useTaskBoard());
    await waitFor(() => expect(result.current.tasks).toEqual([task]));

    await act(async () => {
      await result.current.markTaskAsCompleted("task-1");
    });

    expect(result.current.error).toBe("Não foi possível atualizar a tarefa.");
    expect(result.current.activeTaskId).toBeNull();
    expect(result.current.isSubmitting).toBe(false);
  });

  it("falls back to the default delete error message for non-Error rejections", async () => {
    const task = makeTask("task-1", "Nova tarefa", "pending");
    mockedListTasks.mockResolvedValue([task]);
    mockedDeleteTask.mockRejectedValue("network");

    const { result } = renderHook(() => useTaskBoard());
    await waitFor(() => expect(result.current.tasks).toEqual([task]));

    await act(async () => {
      await result.current.removeTask("task-1");
    });

    expect(result.current.error).toBe("Não foi possível remover a tarefa.");
    expect(result.current.activeTaskId).toBeNull();
    expect(result.current.isSubmitting).toBe(false);
  });

  it("ignores stale successful loads when a newer filter request wins", async () => {
    const stale = deferred<Task[]>();
    const pendingTask = makeTask("task-1", "Revisar exame", "pending");

    mockedListTasks
      .mockImplementationOnce(() => stale.promise)
      .mockResolvedValueOnce([pendingTask])
      .mockResolvedValueOnce(null as unknown as Task[]);

    const { result } = renderHook(() => useTaskBoard());
    await waitFor(() => expect(mockedListTasks).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.setFilter("pending");
    });

    await waitFor(() => expect(mockedListTasks).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(result.current.tasks).toEqual([pendingTask]));
    expect(result.current.summary.pending).toBe(1);

    await act(async () => {
      stale.resolve([makeTask("stale", "Resposta antiga", "completed")]);
      await Promise.resolve();
    });

    expect(result.current.tasks).toEqual([pendingTask]);
    expect(result.current.summary.pending).toBe(1);
  });

  it("ignores stale failed loads when a newer filter request wins", async () => {
    const stale = deferred<Task[]>();
    const pendingTask = makeTask("task-1", "Revisar exame", "pending");

    mockedListTasks
      .mockImplementationOnce(() => stale.promise)
      .mockResolvedValueOnce([pendingTask])
      .mockResolvedValueOnce([pendingTask]);

    const { result } = renderHook(() => useTaskBoard());
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
});
