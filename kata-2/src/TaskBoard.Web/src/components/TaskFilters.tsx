import { taskFilters, type TaskFilter } from "../task-board";

type TaskFiltersProps = {
  currentFilter: TaskFilter;
  disabled: boolean;
  onChange: (nextFilter: TaskFilter) => void;
};

export function TaskFilters({ currentFilter, disabled, onChange }: TaskFiltersProps) {
  return (
    <div className="toolbar" role="group" aria-label="Filtros de tarefas">
      {taskFilters.map((item) => (
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
