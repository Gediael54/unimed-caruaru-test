import { afterEach, describe, expect, it, vi } from "vitest";
import { archiveTask, createTask, listTasks, updateTask } from "./task.service";
import { request } from "../../../shared/lib/http";

vi.mock("../../../shared/lib/http", () => ({
  request: vi.fn()
}));

const mockedRequest = vi.mocked(request);

describe("task API client", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists all active tasks without a query string", async () => {
    mockedRequest.mockResolvedValue([]);

    await listTasks("all");

    expect(mockedRequest).toHaveBeenCalledWith("/tasks");
  });

  it("lists tasks using any supported status filter", async () => {
    mockedRequest.mockResolvedValue([]);

    await listTasks("in_progress");

    expect(mockedRequest).toHaveBeenCalledWith("/tasks?status=in_progress");
  });

  it("creates, updates and archives tasks using the expected payloads", async () => {
    mockedRequest.mockResolvedValue(undefined);

    await createTask({
      title: "Revisar contrato",
      description: "Validar cláusulas críticas",
      priority: "high"
    });
    await updateTask("task-1", { status: "completed", priority: "medium" });
    await archiveTask("task-1");

    expect(mockedRequest).toHaveBeenNthCalledWith(1, "/tasks", {
      method: "POST",
      body: JSON.stringify({
        title: "Revisar contrato",
        description: "Validar cláusulas críticas",
        priority: "high"
      })
    });
    expect(mockedRequest).toHaveBeenNthCalledWith(2, "/tasks/task-1", {
      method: "PATCH",
      body: JSON.stringify({ status: "completed", priority: "medium" })
    });
    expect(mockedRequest).toHaveBeenNthCalledWith(3, "/tasks/task-1", {
      method: "DELETE"
    });
  });

  it("sends null when a new task description is empty", async () => {
    mockedRequest.mockResolvedValue(undefined);

    await createTask({
      title: "Checklist simples",
      description: "",
      priority: "low"
    });

    expect(mockedRequest).toHaveBeenCalledWith("/tasks", {
      method: "POST",
      body: JSON.stringify({
        title: "Checklist simples",
        description: null,
        priority: "low"
      })
    });
  });
});
