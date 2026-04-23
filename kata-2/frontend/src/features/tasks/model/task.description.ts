export type ParsedChecklistItem = {
  done: boolean;
  text: string;
};

export type ParsedTaskDescription = {
  assignees: string[];
  checklist: string[];
  checklistItems: ParsedChecklistItem[];
  checklistProgress: {
    completed: number;
    total: number;
  };
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

function parseChecklistEntry(rawValue: string): ParsedChecklistItem {
  const value = rawValue.trim();
  const markedMatch = value.match(/^\[(x| )\]\s*(.+)$/i);

  if (markedMatch) {
    return {
      done: markedMatch[1].toLowerCase() === "x",
      text: markedMatch[2].trim()
    };
  }

  return {
    done: false,
    text: value
  };
}

export function parseTaskDescription(description: string | null): ParsedTaskDescription {
  const lines = (description ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const summary: string[] = [];
  const labels: string[] = [];
  const assignees: string[] = [];
  const checklistItems: ParsedChecklistItem[] = [];
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
        checklistItems.push(...splitInlineValues(inlineItems).map(parseChecklistEntry));
      }
      collectingChecklist = true;
      continue;
    }

    const bulletMatch = line.match(/^[-*]\s+(.*)$/);
    if (bulletMatch) {
      checklistItems.push(parseChecklistEntry(bulletMatch[1].trim()));
      continue;
    }

    if (collectingChecklist) {
      checklistItems.push(parseChecklistEntry(line));
      continue;
    }

    summary.push(line);
  }

  const checklist = checklistItems.map((item) => item.text).filter(Boolean);

  return {
    assignees: unique(assignees),
    checklist,
    checklistItems: checklistItems.filter((item) => item.text.length > 0),
    checklistProgress: {
      completed: checklistItems.filter((item) => item.done && item.text.length > 0).length,
      total: checklist.length
    },
    dueDate,
    labels: unique(labels),
    summary: summary.length > 0 ? summary.join("\n") : null,
  };
}
