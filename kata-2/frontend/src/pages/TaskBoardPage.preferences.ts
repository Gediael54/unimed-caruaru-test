import type { TaskSortMode, TaskViewMode } from "../features/tasks/model/task.types";

export type BoardPreferences = {
  searchQuery: string;
  sortMode: TaskSortMode;
  viewMode: TaskViewMode;
};

export const STORAGE_KEY = "taskboard.preferences.v1";

const DEFAULT_PREFERENCES: BoardPreferences = {
  searchQuery: "",
  sortMode: "priority",
  viewMode: "kanban"
};

export function readBoardPreferences(): BoardPreferences {
  if (typeof window === "undefined") {
    return DEFAULT_PREFERENCES;
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return DEFAULT_PREFERENCES;
    }

    const parsed = JSON.parse(rawValue) as Partial<BoardPreferences>;
    return {
      searchQuery: parsed.searchQuery ?? DEFAULT_PREFERENCES.searchQuery,
      sortMode: parsed.sortMode ?? DEFAULT_PREFERENCES.sortMode,
      viewMode: parsed.viewMode ?? DEFAULT_PREFERENCES.viewMode
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function writeBoardPreferences(preferences: BoardPreferences) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}
