import { afterEach, describe, expect, it, vi } from "vitest";
import { completeTask, createTask, deleteTask, listTasks } from "../api";
import { request } from "./http";

vi.mock("./http", () => ({
  request: vi.fn()
}));

const mockedRequest = vi.mocked(request);

describe("task API client", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists all tasks without a query string", async () => {
    mockedRequest.mockResolvedValue([]);

    await listTasks("all");

    expect(mockedRequest).toHaveBeenCalledWith("/tasks");
  });

  it("lists tasks using the status filter", async () => {
    mockedRequest.mockResolvedValue([]);

    await listTasks("pending");

    expect(mockedRequest).toHaveBeenCalledWith("/tasks?status=pending");
  });

  it("creates, completes and deletes tasks using the expected payloads", async () => {
    mockedRequest.mockResolvedValue(undefined);

    await createTask("Revisar contrato");
    await completeTask("task-1");
    await deleteTask("task-1");

    expect(mockedRequest).toHaveBeenNthCalledWith(1, "/tasks", {
      method: "POST",
      body: JSON.stringify({ title: "Revisar contrato" })
    });
    expect(mockedRequest).toHaveBeenNthCalledWith(2, "/tasks/task-1", {
      method: "PATCH",
      body: JSON.stringify({ status: "completed" })
    });
    expect(mockedRequest).toHaveBeenNthCalledWith(3, "/tasks/task-1", {
      method: "DELETE"
    });
  });
});
