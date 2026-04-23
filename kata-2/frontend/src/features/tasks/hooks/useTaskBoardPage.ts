import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { archiveTask, createTask, listTasks, updateTask } from "../api/task.service";
import { buildTaskSummary, getTaskListLabel } from "../model/task.selectors";
import type {
  CreateTaskInput,
  Task,
  TaskFilter,
  TaskStatus,
  UpdateTaskInput
} from "../model/task.types";

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useTaskBoardPage() {
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

      if (requestIdRef.current !== requestId) {
        return;
      }

      setTasks(filteredTasks);
      setSummaryTasks(nextFilter === "all" ? filteredTasks : (allTasks ?? filteredTasks));
      setHasLoaded(true);
    } catch (requestError) {
      if (requestIdRef.current !== requestId) {
        return;
      }

      setError(getErrorMessage(requestError, fallbackMessage));
    } finally {
      if (requestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void loadBoard(filter, "Não foi possível carregar o board.");
    });
  }, [filter, loadBoard]);

  async function addTask(input: CreateTaskInput) {
    const trimmedTitle = input.title.trim();
    if (!trimmedTitle) {
      setError("Informe um título para a tarefa.");
      return false;
    }

    setIsSubmitting(true);
    setActiveTaskId(null);
    setError(null);

    try {
      await createTask({
        title: trimmedTitle,
        description: input.description.trim(),
        priority: input.priority
      });
      await loadBoard(filter, "Não foi possível atualizar o board após criar a tarefa.");
      return true;
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Não foi possível criar a tarefa."));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function changeTaskStatus(id: string, status: TaskStatus) {
    setIsSubmitting(true);
    setActiveTaskId(id);
    setError(null);

    try {
      await updateTask(id, { status });
      await loadBoard(filter, "Não foi possível atualizar o board após mover a tarefa.");
      return true;
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Não foi possível atualizar a tarefa."));
      return false;
    } finally {
      setIsSubmitting(false);
      setActiveTaskId(null);
    }
  }

  async function updateTaskDetails(id: string, input: UpdateTaskInput) {
    setIsSubmitting(true);
    setActiveTaskId(id);
    setError(null);

    try {
      await updateTask(id, input);
      await loadBoard(filter, "Não foi possível atualizar o board após salvar o card.");
      return true;
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Não foi possível salvar o card."));
      return false;
    } finally {
      setIsSubmitting(false);
      setActiveTaskId(null);
    }
  }

  async function archiveTaskById(id: string) {
    setIsSubmitting(true);
    setActiveTaskId(id);
    setError(null);

    try {
      await archiveTask(id);
      await loadBoard(filter, "Não foi possível atualizar o board após arquivar a tarefa.");
      return true;
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Não foi possível arquivar a tarefa."));
      return false;
    } finally {
      setIsSubmitting(false);
      setActiveTaskId(null);
    }
  }

  return {
    activeTaskId,
    addTask,
    archiveTask: archiveTaskById,
    changeTaskStatus,
    error,
    filter,
    hasLoaded,
    isBusy: isLoading || isSubmitting,
    isLoading,
    isSubmitting,
    listLabel,
    setFilter,
    summary,
    tasks,
    updateTask: updateTaskDetails
  };
}
