import { describe, expect, it } from "vitest";
import { parseTaskDescription } from "./task.description";

describe("parseTaskDescription", () => {
  it("extracts due date, assignees, labels and checklist from a structured description", () => {
    const parsed = parseTaskDescription(
      [
        "Contexto do card",
        "Responsável: Ana, Bruno",
        "Prazo: 25/04/2026",
        "Labels: jurídico, aprovação",
        "Checklist:",
        "- [x] Validar contrato",
        "- [ ] Anexar evidências"
      ].join("\n")
    );

    expect(parsed.summary).toBe("Contexto do card");
    expect(parsed.assignees).toEqual(["Ana", "Bruno"]);
    expect(parsed.dueDate).toBe("25/04/2026");
    expect(parsed.labels).toEqual(["jurídico", "aprovação"]);
    expect(parsed.checklist).toEqual(["Validar contrato", "Anexar evidências"]);
    expect(parsed.checklistItems).toEqual([
      { done: true, text: "Validar contrato" },
      { done: false, text: "Anexar evidências" }
    ]);
    expect(parsed.checklistProgress).toEqual({ completed: 1, total: 2 });
  });

  it("keeps plain text intact when no indicators are present", () => {
    const parsed = parseTaskDescription("Observação livre sem metadados");

    expect(parsed.summary).toBe("Observação livre sem metadados");
    expect(parsed.assignees).toEqual([]);
    expect(parsed.labels).toEqual([]);
    expect(parsed.checklist).toEqual([]);
    expect(parsed.checklistItems).toEqual([]);
    expect(parsed.checklistProgress).toEqual({ completed: 0, total: 0 });
    expect(parsed.dueDate).toBeNull();
  });

  it("supports inline checklist items and freeform checklist lines after the checklist header", () => {
    const parsed = parseTaskDescription(
      [
        "Checklist: validar contrato, anexar evidências",
        "Revisar pendências com o time",
        "* Publicar retorno final"
      ].join("\n")
    );

    expect(parsed.summary).toBeNull();
    expect(parsed.assignees).toEqual([]);
    expect(parsed.labels).toEqual([]);
    expect(parsed.dueDate).toBeNull();
    expect(parsed.checklist).toEqual([
      "validar contrato",
      "anexar evidências",
      "Revisar pendências com o time",
      "Publicar retorno final"
    ]);
    expect(parsed.checklistItems).toEqual([
      { done: false, text: "validar contrato" },
      { done: false, text: "anexar evidências" },
      { done: false, text: "Revisar pendências com o time" },
      { done: false, text: "Publicar retorno final" }
    ]);
    expect(parsed.checklistProgress).toEqual({ completed: 0, total: 4 });
  });

  it("returns empty metadata for null descriptions", () => {
    const parsed = parseTaskDescription(null);

    expect(parsed.summary).toBeNull();
    expect(parsed.assignees).toEqual([]);
    expect(parsed.labels).toEqual([]);
    expect(parsed.checklist).toEqual([]);
    expect(parsed.checklistItems).toEqual([]);
    expect(parsed.checklistProgress).toEqual({ completed: 0, total: 0 });
    expect(parsed.dueDate).toBeNull();
  });
});
