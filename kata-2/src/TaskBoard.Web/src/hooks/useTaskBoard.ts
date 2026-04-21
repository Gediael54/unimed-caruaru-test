import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { completeTask, createTask, deleteTask, listTasks } from "../api";
import { buildTaskSummary, type TaskFilter, getTaskListLabel } from "../task-board";
import type { Task } from "../types";

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useTaskBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [summaryTasks, setSummaryTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const summary = useMemo(() => buildTaskSummary(summaryTasks), [summaryTasks]);
  const listLabel = useMemo(() => getTaskListLabel(filter), [filter]);

  const loadBoard = useCallback(async (nextFilter: TaskFilter, fallbackMessage: string) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);
    setError(null);

    try {
      const [filteredTasks, allTasks] = await Promise.all([
        listTasks(nextFilter),
        nextFilter === "all" ? Promise.resolve(null) : listTasks("all")
      ]);

      if (requestIdRef.current != requestId) {
        return;
      }

      setTasks(filteredTasks);
      setSummaryTasks(nextFilter === "all" ? filteredTasks : (allTasks ?? filteredTasks));
      setHasLoaded(true);
    } catch (requestError) {
      if (requestIdRef.current != requestId) {
        return;
      }

      setError(getErrorMessage(requestError, fallbackMessage));
    } finally {
      if (requestIdRef.current == requestId) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void loadBoard(filter, "Não foi possível carregar as tarefas.");
    });
  }, [filter, loadBoard]);

  async function addTask(title: string) {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Informe um título para a tarefa.");
      return false;
    }

    setIsSubmitting(true);
    setActiveTaskId(null);
    setError(null);

    try {
      await createTask(trimmedTitle);
      await loadBoard(filter, "Não foi possível atualizar a lista após criar a tarefa.");
      return true;
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Não foi possível criar a tarefa."));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function markTaskAsCompleted(id: string) {
    setIsSubmitting(true);
    setActiveTaskId(id);
    setError(null);

    try {
      await completeTask(id);
      await loadBoard(filter, "Não foi possível atualizar a lista após concluir a tarefa.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Não foi possível atualizar a tarefa."));
    } finally {
      setIsSubmitting(false);
      setActiveTaskId(null);
    }
  }

  async function removeTask(id: string) {
    setIsSubmitting(true);
    setActiveTaskId(id);
    setError(null);

    try {
      await deleteTask(id);
      await loadBoard(filter, "Não foi possível atualizar a lista após remover a tarefa.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Não foi possível remover a tarefa."));
    } finally {
      setIsSubmitting(false);
      setActiveTaskId(null);
    }
  }

  return {
    activeTaskId,
    addTask,
    error,
    filter,
    hasLoaded,
    isLoading,
    isSubmitting,
    listLabel,
    markTaskAsCompleted,
    removeTask,
    setFilter,
    summary,
    tasks
  };
}
