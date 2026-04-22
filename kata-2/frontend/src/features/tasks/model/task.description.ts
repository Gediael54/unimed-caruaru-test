export type ParsedTaskDescription = {
  assignees: string[];
  checklist: string[];
  dueDate: string | null;
  labels: string[];
  summary: string | null;
};

const splitInlineValues = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const unique = (values: string[]) => [...new Set(values)];

export function parseTaskDescription(description: string | null): ParsedTaskDescription {
  const lines = (description ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const summary: string[] = [];
  const labels: string[] = [];
  const assignees: string[] = [];
  const checklist: string[] = [];
  let dueDate: string | null = null;
  let collectingChecklist = false;

  for (const line of lines) {
    const assigneeMatch = line.match(/^(respons[aá]vel|respons[aá]veis|membros?):\s*(.+)$/i);
    if (assigneeMatch) {
      assignees.push(...splitInlineValues(assigneeMatch[2]));
      collectingChecklist = false;
      continue;
    }

    const dueDateMatch = line.match(/^(prazo|data limite|due date):\s*(.+)$/i);
    if (dueDateMatch) {
      dueDate = dueDateMatch[2].trim();
      collectingChecklist = false;
      continue;
    }

    const labelMatch = line.match(/^(labels?|etiquetas?):\s*(.+)$/i);
    if (labelMatch) {
      labels.push(...splitInlineValues(labelMatch[2]));
      collectingChecklist = false;
      continue;
    }

    const checklistMatch = line.match(/^checklist:\s*(.*)$/i);
    if (checklistMatch) {
      const inlineItems = checklistMatch[1].trim();
      if (inlineItems) {
        checklist.push(...splitInlineValues(inlineItems));
      }
      collectingChecklist = true;
      continue;
    }

    const bulletMatch = line.match(/^[-*]\s+(.*)$/);
    if (bulletMatch) {
      checklist.push(bulletMatch[1].trim());
      continue;
    }

    if (collectingChecklist) {
      checklist.push(line);
      continue;
    }

    summary.push(line);
  }

  return {
    assignees: unique(assignees),
    checklist: checklist.filter(Boolean),
    dueDate,
    labels: unique(labels),
    summary: summary.length > 0 ? summary.join("\n") : null,
  };
}
