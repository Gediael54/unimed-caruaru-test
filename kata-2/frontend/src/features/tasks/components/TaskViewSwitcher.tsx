import { LayoutList, PanelsTopLeft, Rows3, ScanSearch } from "lucide-react";
import { taskViewModes } from "../model/task.constants";
import type { TaskViewMode } from "../model/task.types";

type TaskViewSwitcherProps = {
  currentView: TaskViewMode;
  disabled: boolean;
  onChange: (nextView: TaskViewMode) => void;
};

export function TaskViewSwitcher({
  currentView,
  disabled,
  onChange
}: TaskViewSwitcherProps) {
  const icons = {
    list: LayoutList,
    kanban: PanelsTopLeft,
    timeline: Rows3,
    focus: ScanSearch
  } as const;

  return (
    <div className="view-switcher" role="group" aria-label="Modos de visualização">
      {taskViewModes.map((item) => {
        const Icon = icons[item.value];

        return (
          <button
            aria-label={item.label}
            aria-pressed={currentView === item.value}
            className={currentView === item.value ? "active" : ""}
            disabled={disabled}
            key={item.value}
            onClick={() => onChange(item.value)}
            type="button"
          >
            <Icon size={14} aria-hidden="true" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
