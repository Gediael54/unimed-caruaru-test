import { FormEvent, useEffect, useMemo, useState } from "react";
import { completeTask, createTask, deleteTask, listTasks } from "./api";
import type { Task, TaskStatus } from "./types";

type Filter = TaskStatus | "all";

const filters: Array<{ label: string; value: Filter }> = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Completed", value: "completed" }
];

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [title, setTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const summary = useMemo(() => {
    return {
      total: tasks.length,
      pending: tasks.filter((task) => task.status === "pending").length,
      completed: tasks.filter((task) => task.status === "completed").length
    };
  }, [tasks]);

  async function loadTasks(nextFilter = filter) {
    setIsLoading(true);
    setError(null);
    try {
      setTasks(await listTasks(nextFilter));
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to load tasks."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadTasks(filter);
  }, [filter]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Title is required.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await createTask(trimmedTitle);
      setTitle("");
      await loadTasks();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to create task."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleComplete(id: string) {
    setIsLoading(true);
    setError(null);
    try {
      await completeTask(id);
      await loadTasks();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to update task."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setIsLoading(true);
    setError(null);
    try {
      await deleteTask(id);
      await loadTasks();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to delete task."
      );
    } finally {
      setIsLoading(false);
    }
  }

  function changeFilter(nextFilter: Filter) {
    setFilter(nextFilter);
  }

  return (
    <main className="app-shell">
      <section className="board-header" aria-labelledby="page-title">
        <div>
          <p className="eyebrow">Task Board</p>
          <h1 id="page-title">Today&apos;s work</h1>
        </div>
        <dl className="summary-grid" aria-label="Task summary">
          <div>
            <dt>Total</dt>
            <dd>{summary.total}</dd>
          </div>
          <div>
            <dt>Pending</dt>
            <dd>{summary.pending}</dd>
          </div>
          <div>
            <dt>Done</dt>
            <dd>{summary.completed}</dd>
          </div>
        </dl>
      </section>

      <form className="task-form" onSubmit={handleSubmit}>
        <label htmlFor="task-title">New task</label>
        <div className="task-form-row">
          <input
            id="task-title"
            maxLength={120}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Write the next task"
            type="text"
            value={title}
          />
          <button disabled={isLoading} type="submit">
            Add
          </button>
        </div>
      </form>

      <div className="toolbar" aria-label="Task filters">
        {filters.map((item) => (
          <button
            aria-pressed={filter === item.value}
            className={filter === item.value ? "active" : ""}
            disabled={isLoading}
            key={item.value}
            onClick={() => changeFilter(item.value)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      {error ? <p className="error-message">{error}</p> : null}

      <section className="task-list" aria-live="polite">
        {isLoading && tasks.length === 0 ? <p>Loading tasks...</p> : null}
        {!isLoading && tasks.length === 0 ? <p>No tasks for this filter.</p> : null}
        {tasks.map((task) => (
          <article className="task-item" key={task.id}>
            <div>
              <p className="task-title">{task.title}</p>
              <p className="task-meta">
                {task.status === "completed" ? "Completed" : "Pending"}
              </p>
            </div>
            <div className="task-actions">
              {task.status === "pending" ? (
                <button
                  disabled={isLoading}
                  onClick={() => void handleComplete(task.id)}
                  type="button"
                >
                  Complete
                </button>
              ) : null}
              <button
                className="secondary"
                disabled={isLoading}
                onClick={() => void handleDelete(task.id)}
                type="button"
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

export default App;
