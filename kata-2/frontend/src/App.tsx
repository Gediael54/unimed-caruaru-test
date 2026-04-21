import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  ClipboardList,
  Clock,
  Inbox,
  ListTodo,
  Plus,
  Trash2
} from "lucide-react";
import { completeTask, createTask, deleteTask, listTasks } from "./api";
import type { Task, TaskStatus } from "./types";

type Filter = TaskStatus | "all";

const filters: Array<{ label: string; value: Filter }> = [
  { label: "Todas", value: "all" },
  { label: "Pendentes", value: "pending" },
  { label: "Concluídas", value: "completed" }
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
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível carregar as tarefas."
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
      setError("Informe um título para a tarefa.");
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
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível criar a tarefa."
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
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível atualizar a tarefa."
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
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível remover a tarefa."
      );
    } finally {
      setIsLoading(false);
    }
  }

  function changeFilter(nextFilter: Filter) {
    setFilter(nextFilter);
  }

  const listLabel =
    filter === "pending"
      ? "Tarefas pendentes"
      : filter === "completed"
      ? "Tarefas concluídas"
      : "Todas as tarefas";

  return (
    <main className="app-shell">
      <header className="site-header">
        <span className="brand-mark" aria-hidden="true">
          <ClipboardList size={22} />
        </span>
        <span className="brand-text">
          <strong>Task Board</strong>
          <span>Unimed Caruaru</span>
        </span>
      </header>

      <section className="board-header" aria-labelledby="page-title">
        <div>
          <p className="eyebrow">Painel de Tarefas</p>
          <h1 id="page-title">Organize o trabalho de hoje</h1>
          <p className="page-subtitle">
            Cadastre, acompanhe e finalize atividades com uma visão rápida do que está
            pendente e do que já foi concluído.
          </p>
        </div>
        <dl className="summary-grid" aria-label="Resumo das tarefas">
          <div className="summary-card">
            <span className="icon-badge neutral" aria-hidden="true">
              <ListTodo size={20} />
            </span>
            <div>
              <dt>Total</dt>
              <dd>{summary.total}</dd>
            </div>
          </div>
          <div className="summary-card">
            <span className="icon-badge warning" aria-hidden="true">
              <Clock size={20} />
            </span>
            <div>
              <dt>Pendentes</dt>
              <dd>{summary.pending}</dd>
            </div>
          </div>
          <div className="summary-card">
            <span className="icon-badge" aria-hidden="true">
              <CheckCircle2 size={20} />
            </span>
            <div>
              <dt>Concluídas</dt>
              <dd>{summary.completed}</dd>
            </div>
          </div>
        </dl>
      </section>

      <form className="task-form panel" onSubmit={handleSubmit}>
        <label htmlFor="task-title">Nova tarefa</label>
        <div className="task-form-row">
          <div className="input-wrap">
            <Plus className="input-icon" size={18} aria-hidden="true" />
            <input
              id="task-title"
              maxLength={120}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Descreva a próxima tarefa"
              type="text"
              value={title}
            />
          </div>
          <button disabled={isLoading} type="submit">
            <Plus size={18} aria-hidden="true" />
            Adicionar
          </button>
        </div>
      </form>

      <div className="toolbar" role="group" aria-label="Filtros de tarefas">
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

      {error ? (
        <p className="error-message" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}

      <div className="task-list-header">
        <h2>{listLabel}</h2>
        <span className="count-pill" aria-label={`${tasks.length} tarefas`}>
          {tasks.length} {tasks.length === 1 ? "tarefa" : "tarefas"}
        </span>
      </div>

      <section className="task-list" aria-live="polite">
        {isLoading && tasks.length === 0 ? (
          <div className="loading-state">
            <span className="spinner" aria-hidden="true" />
            <span>Carregando tarefas...</span>
          </div>
        ) : null}

        {!isLoading && tasks.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon" aria-hidden="true">
              <Inbox size={24} />
            </span>
            <strong>Nenhuma tarefa por aqui</strong>
            <span>Crie uma nova tarefa ou altere o filtro para ver outros itens.</span>
          </div>
        ) : null}

        {tasks.map((task) => {
          const isCompleted = task.status === "completed";
          return (
            <article
              className={`task-item${isCompleted ? " is-completed" : ""}`}
              key={task.id}
            >
              <span className="task-status-icon" aria-hidden="true">
                {isCompleted ? <CheckCircle2 size={20} /> : <Circle size={20} />}
              </span>
              <div className="task-body">
                <p className="task-title">{task.title}</p>
                <span className="task-meta">
                  {isCompleted ? (
                    <>
                      <CheckCircle2 size={12} aria-hidden="true" />
                      Concluída
                    </>
                  ) : (
                    <>
                      <Clock size={12} aria-hidden="true" />
                      Pendente
                    </>
                  )}
                </span>
              </div>
              <div className="task-actions">
                {!isCompleted ? (
                  <button
                    disabled={isLoading}
                    onClick={() => void handleComplete(task.id)}
                    type="button"
                  >
                    <CheckCircle2 size={16} aria-hidden="true" />
                    Concluir
                  </button>
                ) : null}
                <button
                  className="danger"
                  disabled={isLoading}
                  onClick={() => void handleDelete(task.id)}
                  type="button"
                  aria-label={`Remover tarefa ${task.title}`}
                >
                  <Trash2 size={16} aria-hidden="true" />
                  Remover
                </button>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}

export default App;
