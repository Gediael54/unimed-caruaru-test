import { FormEvent, useMemo, useState } from "react";
import { CalendarDays, ListChecks, Save, Tags, UserRound } from "lucide-react";
import { PRIORITY_DESCRIPTIONS } from "../model/task.constants";
import { parseTaskDescription } from "../model/task.description";
import {
  buildTaskDescription,
  createTaskEditorValues,
  type TaskEditorValues
} from "../model/task.editor";
import type { CreateTaskInput, Task, TaskPriority } from "../model/task.types";

type TaskComposerProps = {
  disabled: boolean;
  initialTask?: Task | null;
  mode?: "create" | "edit";
  onCancel?: () => void;
  onSubmit: (input: CreateTaskInput) => Promise<boolean>;
};

export function TaskComposer({
  disabled,
  initialTask = null,
  mode = "create",
  onCancel,
  onSubmit
}: TaskComposerProps) {
  const [values, setValues] = useState<TaskEditorValues>(() => createTaskEditorValues(initialTask));
  const [titleError, setTitleError] = useState<string | null>(null);

  const description = useMemo(() => buildTaskDescription(values), [values]);
  const parsedDescription = useMemo(() => parseTaskDescription(description), [description]);
  const hasPreview =
    parsedDescription.assignees.length > 0
    || parsedDescription.labels.length > 0
    || Boolean(parsedDescription.dueDate)
    || parsedDescription.checklist.length > 0
    || Boolean(parsedDescription.summary);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!values.title.trim()) {
      setTitleError(
        mode === "edit"
          ? "Informe um título antes de salvar o card."
          : "Informe um título antes de criar o card."
      );
      return;
    }

    setTitleError(null);
    const wasSaved = await onSubmit({
      title: values.title.trim(),
      description,
      priority: values.priority
    });

    if (wasSaved && mode === "create") {
      setValues(createTaskEditorValues(null));
      setTitleError(null);
    }
  }

  function updateValue<Key extends keyof TaskEditorValues>(key: Key, value: TaskEditorValues[Key]) {
    setValues((current) => ({ ...current, [key]: value }));
    if (key === "title" && titleError && String(value).trim()) {
      setTitleError(null);
    }
  }

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <div className="task-form-main">
        <div className={`task-form-field${titleError ? " task-form-field--error" : ""}`}>
          <label htmlFor="task-title">Título</label>
          <input
            aria-describedby={titleError ? "task-title-error" : undefined}
            aria-invalid={titleError ? "true" : "false"}
            id="task-title"
            maxLength={120}
            onChange={(event) => updateValue("title", event.target.value)}
            placeholder="Descreva a próxima entrega"
            type="text"
            value={values.title}
          />
          {titleError ? (
            <p className="task-form-inline-error" id="task-title-error" role="alert">
              {titleError}
            </p>
          ) : null}
        </div>

        <div className="task-form-field task-form-field--description">
          <label htmlFor="task-description">Descrição</label>
          <textarea
            id="task-description"
            maxLength={600}
            onChange={(event) => updateValue("summary", event.target.value)}
            placeholder="Contexto do card e objetivo principal."
            rows={6}
            value={values.summary}
          />
        </div>

        <div className="task-form-grid">
          <div className="task-form-field">
            <label htmlFor="task-assignees">Responsáveis</label>
            <input
              id="task-assignees"
              onChange={(event) => updateValue("assignees", event.target.value)}
              placeholder="Ana, Bruno"
              type="text"
              value={values.assignees}
            />
            <small>Separe por vírgula para gerar os indicadores do card.</small>
          </div>

          <div className="task-form-field">
            <label htmlFor="task-due-date">Prazo</label>
            <input
              id="task-due-date"
              onChange={(event) => updateValue("dueDate", event.target.value)}
              type="date"
              value={values.dueDate}
            />
            <small>Usado para sinal visual de prazo no board.</small>
          </div>

          <div className="task-form-field">
            <label htmlFor="task-labels">Labels</label>
            <input
              id="task-labels"
              onChange={(event) => updateValue("labels", event.target.value)}
              placeholder="jurídico, operação"
              type="text"
              value={values.labels}
            />
            <small>Separe por vírgula para destacar contexto do card.</small>
          </div>

          <div className="task-form-field">
            <label htmlFor="task-priority">Prioridade</label>
            <select
              id="task-priority"
              onChange={(event) => updateValue("priority", event.target.value as TaskPriority)}
              value={values.priority}
            >
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
            </select>
            <small>{PRIORITY_DESCRIPTIONS[values.priority]}</small>
          </div>
        </div>

        <div className="task-form-field task-form-field--description">
          <label htmlFor="task-checklist">Checklist</label>
          <textarea
            id="task-checklist"
            onChange={(event) => updateValue("checklist", event.target.value)}
            placeholder={"Um item por linha. Use [x] no início para marcar como concluído."}
            rows={6}
            value={values.checklist}
          />
        </div>
      </div>

      <aside className="task-form-side" aria-label="Resumo do card em edição">
        <section className="task-form-side-card">
          <div className="task-form-side-head">
            <strong>Campos do card</strong>
            <span>Estrutura próxima de um board profissional, sem inflar o contrato HTTP.</span>
          </div>
          <div className="task-form-side-list">
            <div className="task-form-side-list-item">
              <UserRound size={14} aria-hidden="true" />
              <span>Responsáveis viram pills no board.</span>
            </div>
            <div className="task-form-side-list-item">
              <CalendarDays size={14} aria-hidden="true" />
              <span>Prazo gera sinal visual de acompanhamento.</span>
            </div>
            <div className="task-form-side-list-item">
              <Tags size={14} aria-hidden="true" />
              <span>Labels reforçam contexto sem poluir o título.</span>
            </div>
            <div className="task-form-side-list-item">
              <ListChecks size={14} aria-hidden="true" />
              <span>Checklist mostra progresso e itens concluídos.</span>
            </div>
          </div>
        </section>

        <section className="task-form-side-card">
          <div className="task-form-side-head">
            <strong>Leitura do card</strong>
            <span>Prévia dos indicadores que sobem para o board</span>
          </div>
          {hasPreview ? (
            <div className="task-form-preview" aria-label="Prévia do card">
              {parsedDescription.summary ? (
                <div className="task-form-preview-row">
                  <span>Resumo</span>
                  <strong>{parsedDescription.summary}</strong>
                </div>
              ) : null}
              {parsedDescription.assignees.length > 0 ? (
                <div className="task-form-preview-row">
                  <span>Responsáveis</span>
                  <strong>{parsedDescription.assignees.join(", ")}</strong>
                </div>
              ) : null}
              {parsedDescription.dueDate ? (
                <div className="task-form-preview-row">
                  <span>Prazo</span>
                  <strong>{parsedDescription.dueDate}</strong>
                </div>
              ) : null}
              {parsedDescription.labels.length > 0 ? (
                <div className="task-form-preview-row">
                  <span>Labels</span>
                  <div className="task-form-preview-chips">
                    {parsedDescription.labels.map((label) => (
                      <span className="task-indicator-chip task-indicator-chip--label" key={`preview-label-${label}`}>
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {parsedDescription.checklist.length > 0 ? (
                <div className="task-form-preview-row">
                  <span>Checklist</span>
                  <strong>
                    {formatChecklistProgress(
                      parsedDescription.checklistProgress.completed,
                      parsedDescription.checklistProgress.total
                    )}
                  </strong>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="task-form-preview-empty">
              <p>Preencha os campos do card para visualizar como ele sobe para o board.</p>
            </div>
          )}
        </section>
      </aside>

      <div className="task-form-actions">
        {onCancel ? (
          <button className="ghost" disabled={disabled} onClick={onCancel} type="button">
            Cancelar
          </button>
        ) : null}
        <button className="primary" disabled={disabled} type="submit">
          <Save size={16} aria-hidden="true" />
          {mode === "edit" ? "Salvar card" : "Criar card"}
        </button>
      </div>
    </form>
  );
}

function formatChecklistProgress(completed: number, total: number) {
  if (total === 1) {
    return `${completed}/1 concluído`;
  }

  return `${completed}/${total} concluídos`;
}
