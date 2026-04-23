import { taskFilters } from "../model/task.constants";
import type { TaskFilter, TaskViewMode } from "../model/task.types";

type TaskFiltersProps = {
  currentFilter: TaskFilter;
  disabled: boolean;
  onChange: (nextFilter: TaskFilter) => void;
  viewMode: TaskViewMode;
};

const FILTERS_BY_VIEW: Record<TaskViewMode, TaskFilter[]> = {
  list: ["all", "pending", "in_progress", "completed", "cancelled", "archived"],
  kanban: [],
  timeline: ["all", "in_progress", "completed", "pending", "cancelled", "archived"],
  focus: ["all", "pending", "in_progress", "completed", "cancelled"]
};

export function TaskFilters({ currentFilter, disabled, onChange, viewMode }: TaskFiltersProps) {
  const orderedValues = FILTERS_BY_VIEW[viewMode];
  if (orderedValues.length === 0) {
    return null;
  }
  const filterValues = orderedValues.includes(currentFilter)
    ? orderedValues
    : [...orderedValues, currentFilter];
  const items = filterValues
    .map((value) => taskFilters.find((item) => item.value === value))
    .filter((item): item is (typeof taskFilters)[number] => item !== undefined);

  return (
    <div className={`filter-pills filter-pills--${viewMode}`} role="group" aria-label="Filtros de tarefas">
      {items.map((item) => (
        <button
          aria-pressed={currentFilter === item.value}
          className={currentFilter === item.value ? "active" : ""}
          disabled={disabled}
          key={item.value}
          onClick={() => onChange(item.value)}
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
