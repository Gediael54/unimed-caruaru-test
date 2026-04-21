import { LayoutList, PanelsTopLeft, Rows3, ScanSearch } from "lucide-react";
import { taskViewModes, type TaskViewMode } from "../task-board";

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
    <div className="toolbar" role="group" aria-label="Modos de visualização">
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
            <span className="toolbar-button-icon" aria-hidden="true">
              <Icon size={16} />
            </span>
            <span className="toolbar-button-copy">
              <span>{item.label}</span>
              <small>{item.caption}</small>
            </span>
          </button>
        );
      })}
    </div>
  );
}
