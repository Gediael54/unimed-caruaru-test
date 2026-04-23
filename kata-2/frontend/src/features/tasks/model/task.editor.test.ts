import { describe, expect, it } from "vitest";
import {
  buildTaskDescription,
  createTaskEditorValues,
  type TaskEditorValues
} from "./task.editor";
import type { Task } from "./task.types";

function makeTask(description: string | null): Task {
  return {
    id: "task-1",
    title: "Refine board flow",
    description,
    priority: "high",
    status: "pending",
    createdAt: "2026-04-20T10:00:00Z",
    updatedAt: "2026-04-20T10:00:00Z",
    archivedAt: null
  };
}

function makeValues(overrides: Partial<TaskEditorValues> = {}): TaskEditorValues {
  return {
    assignees: "",
    checklist: "",
    dueDate: "",
    labels: "",
    priority: "medium",
    summary: "",
    title: "Refine board flow",
    ...overrides
  };
}

describe("task editor helpers", () => {
  it("creates empty editor values when the task has no metadata", () => {
    expect(createTaskEditorValues(makeTask(null))).toEqual({
      assignees: "",
      checklist: "",
      dueDate: "",
      labels: "",
      priority: "high",
      summary: "",
      title: "Refine board flow"
    });
  });

  it("maps structured descriptions back into editor fields", () => {
    expect(
      createTaskEditorValues(
        makeTask(
          [
            "Structured summary",
            "Responsável: Ana, Bruno",
            "Prazo: 25/04/2026",
            "Labels: board, ux",
            "Checklist:",
            "- [x] Review flow",
            "- Validate feedback"
          ].join("\n")
        )
      )
    ).toEqual({
      assignees: "Ana, Bruno",
      checklist: "[x] Review flow\n[ ] Validate feedback",
      dueDate: "2026-04-25",
      labels: "board, ux",
      priority: "high",
      summary: "Structured summary",
      title: "Refine board flow"
    });
  });

  it("keeps ISO dates, converts PT-BR dates and drops unsupported values", () => {
    expect(
      createTaskEditorValues(makeTask("Prazo: 25/04/2026")).dueDate
    ).toBe("2026-04-25");
    expect(
      createTaskEditorValues(makeTask("Prazo: 2026-04-25")).dueDate
    ).toBe("2026-04-25");
    expect(
      createTaskEditorValues(makeTask("Prazo: tomorrow")).dueDate
    ).toBe("");
  });

  it("builds a structured description with summary, metadata and checklist progress markers", () => {
    expect(
      buildTaskDescription(
        makeValues({
          assignees: "Ana, Bruno",
          checklist: "[x] Review flow\nValidate feedback",
          dueDate: "2026-04-25",
          labels: "board, ux",
          summary: "Structured summary"
        })
      )
    ).toBe(
      [
        "Structured summary",
        "Responsável: Ana, Bruno",
        "Prazo: 25/04/2026",
        "Labels: board, ux",
        "Checklist:",
        "- [x] Review flow",
        "- Validate feedback"
      ].join("\n")
    );
  });

  it("keeps custom non-ISO due dates untouched when saving", () => {
    expect(
      buildTaskDescription(
        makeValues({
          dueDate: "custom-date"
        })
      )
    ).toBe("Prazo: custom-date");
  });

  it("returns an empty description when the editor only has blank values", () => {
    expect(
      buildTaskDescription(
        makeValues({
          assignees: "   ",
          checklist: "",
          dueDate: "",
          labels: "   ",
          summary: "   ",
          title: ""
        })
      )
    ).toBe("");
  });
});
