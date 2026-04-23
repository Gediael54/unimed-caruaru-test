import { afterEach, describe, expect, it } from "vitest";
import {
  STORAGE_KEY,
  readBoardPreferences,
  writeBoardPreferences
} from "./TaskBoardPage.preferences";

describe("TaskBoardPage preferences helpers", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("returns the default preferences when there is no saved state", () => {
    expect(readBoardPreferences()).toEqual({
      searchQuery: "",
      sortMode: "priority",
      viewMode: "kanban"
    });
  });

  it("returns the default preferences when the saved state is invalid JSON", () => {
    window.localStorage.setItem(STORAGE_KEY, "{invalid");

    expect(readBoardPreferences()).toEqual({
      searchQuery: "",
      sortMode: "priority",
      viewMode: "kanban"
    });
  });

  it("reads partial saved preferences and fills missing values with defaults", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ searchQuery: "board" }));

    expect(readBoardPreferences()).toEqual({
      searchQuery: "board",
      sortMode: "priority",
      viewMode: "kanban"
    });
  });

  it("writes the current board preferences to localStorage", () => {
    writeBoardPreferences({
      searchQuery: "ux",
      sortMode: "title",
      viewMode: "timeline"
    });

    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}")).toEqual({
      searchQuery: "ux",
      sortMode: "title",
      viewMode: "timeline"
    });
  });

  it("gracefully handles environments without window", () => {
    const originalWindow = globalThis.window;

    Reflect.deleteProperty(globalThis, "window");

    try {
      expect(readBoardPreferences()).toEqual({
        searchQuery: "",
        sortMode: "priority",
        viewMode: "kanban"
      });
      expect(() =>
        writeBoardPreferences({
          searchQuery: "",
          sortMode: "priority",
          viewMode: "kanban"
        })
      ).not.toThrow();
    } finally {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: originalWindow,
        writable: true
      });
    }
  });
});
