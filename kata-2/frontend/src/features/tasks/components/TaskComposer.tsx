import { FormEvent, useState } from "react";
import { CalendarDays, ListChecks, Plus, Tags, UserRound } from "lucide-react";
import { PRIORITY_DESCRIPTIONS } from "../model/task.constants";
import { parseTaskDescription } from "../model/task.description";
import type { CreateTaskInput, TaskPriority } from "../model/task.types";

type TaskComposerProps = {
  disabled: boolean;
  onSubmit: (input: CreateTaskInput) => Promise<boolean>;
};

export function TaskComposer({ disabled, onSubmit }: TaskComposerProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const parsedDescription = parseTaskDescription(description);
  const hasDetectedSignals =
    Boolean(parsedDescription.summary)
    || parsedDescription.assignees.length > 0
    || parsedDescription.labels.length > 0
    || parsedDescription.checklist.length > 0
    || Boolean(parsedDescription.dueDate);

  const descriptionTools = [
    {
      label: "Responsável",
      helper: "vira responsável visível no card",
      icon: UserRound
    },
    {
      label: "Prazo",
      helper: "aparece como indicador de data",
      icon: CalendarDays
    },
    {
      label: "Labels",
      helper: "gera tags de contexto",
      icon: Tags
    },
    {
      label: "Checklist",
      helper: "monta prévia de itens do card",
      icon: ListChecks
    }
  ] as const;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const wasCreated = await onSubmit({ title, description, priority });

    if (wasCreated) {
      setTitle("");
      setDescription("");
      setPriority("medium");
    }
  }

  return (
    <form className="task-form panel" onSubmit={handleSubmit}>
      <div className="task-form-head">
        <div>
          <span className="task-form-kicker">Novo card</span>
          <p>
            Registre título, contexto e prioridade. A descrição também pode carregar sinais
            de card no estilo Trello, como responsável, prazo, labels e checklist curto.
          </p>
        </div>
      </div>

      <div className="task-form-grid">
        <div className="task-form-field task-form-field--title">
          <label htmlFor="task-title">Título</label>
          <div className="input-wrap">
            <Plus className="input-icon" size={18} aria-hidden="true" />
            <input
              id="task-title"
              maxLength={120}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Descreva a próxima entrega"
              type="text"
              value={title}
            />
          </div>
        </div>

        <div className="task-form-field task-form-field--priority">
          <label htmlFor="task-priority">Prioridade</label>
          <select
            id="task-priority"
            onChange={(event) => setPriority(event.target.value as TaskPriority)}
            value={priority}
          >
            <option value="low">Baixa</option>
            <option value="medium">Média</option>
            <option value="high">Alta</option>
          </select>
          <small>{PRIORITY_DESCRIPTIONS[priority]}</small>
        </div>

        <div className="task-form-field task-form-field--description">
          <label htmlFor="task-description">Descrição</label>
          <div className="task-form-description-layout">
            <div className="task-form-description-input">
              <textarea
                id="task-description"
                maxLength={600}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={"Contexto rápido do card\n\nResponsável: Ana, Bruno\nPrazo: 25/04/2026\nLabels: jurídico, aprovação\nChecklist:\n- Validar contrato\n- Anexar evidências"}
                rows={7}
                value={description}
              />
            </div>

            <div className="task-form-description-insights">
              <div className="task-form-tools" aria-label="Ferramentas da descrição">
                {descriptionTools.map((tool) => {
                  const Icon = tool.icon;

                  return (
                    <div className="task-form-tool" key={tool.label}>
                      <span className="task-form-tool-icon" aria-hidden="true">
                        <Icon size={15} />
                      </span>
                      <div>
                        <strong>{tool.label}:</strong> <span>{tool.helper}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="task-form-preview" aria-label="Prévia dos indicadores da descrição">
                <div className="task-form-preview-head">
                  <span className="task-form-preview-kicker">Leitura em tempo real</span>
                  <p>Os dados alterados na descrição aparecem aqui antes de entrar no card.</p>
                </div>

                <div className="task-form-preview-grid">
                  <div className="task-form-preview-card">
                    <span>
                      <UserRound size={14} aria-hidden="true" />
                      Responsáveis
                    </span>
                    <strong>
                      {parsedDescription.assignees.length > 0
                        ? parsedDescription.assignees.join(", ")
                        : "Nenhum detectado"}
                    </strong>
                  </div>
                  <div className="task-form-preview-card">
                    <span>
                      <CalendarDays size={14} aria-hidden="true" />
                      Prazo
                    </span>
                    <strong>{parsedDescription.dueDate ?? "Não informado"}</strong>
                  </div>
                  <div className="task-form-preview-card">
                    <span>
                      <Tags size={14} aria-hidden="true" />
                      Labels
                    </span>
                    <strong>
                      {parsedDescription.labels.length > 0
                        ? `${parsedDescription.labels.length} ${parsedDescription.labels.length === 1 ? "detectada" : "detectadas"}`
                        : "Nenhuma detectada"}
                    </strong>
                  </div>
                  <div className="task-form-preview-card">
                    <span>
                      <ListChecks size={14} aria-hidden="true" />
                      Checklist
                    </span>
                    <strong>
                      {parsedDescription.checklist.length > 0
                        ? `${parsedDescription.checklist.length} ${parsedDescription.checklist.length === 1 ? "item" : "itens"}`
                        : "Sem itens"}
                    </strong>
                  </div>
                </div>

                {hasDetectedSignals ? (
                  <div className="task-form-preview-body">
                    {parsedDescription.summary ? (
                      <p className="task-form-preview-summary">{parsedDescription.summary}</p>
                    ) : null}

                    {parsedDescription.labels.length > 0 ? (
                      <div className="task-form-preview-chips">
                        {parsedDescription.labels.map((label) => (
                          <span className="task-indicator-chip task-indicator-chip--label" key={`preview-label-${label}`}>
                            {label}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {parsedDescription.checklist.length > 0 ? (
                      <ul className="task-form-preview-checklist">
                        {parsedDescription.checklist.slice(0, 3).map((item) => (
                          <li key={`preview-check-${item}`}>{item}</li>
                        ))}
                        {parsedDescription.checklist.length > 3 ? (
                          <li className="task-checklist-more">
                            +{parsedDescription.checklist.length - 3} itens
                          </li>
                        ) : null}
                      </ul>
                    ) : null}
                  </div>
                ) : (
                  <p className="task-form-preview-empty">
                    Nenhuma ferramenta detectada ainda. Use os marcadores acima para enriquecer o card.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="task-form-actions">
        <button disabled={disabled} type="submit">
          <Plus size={18} aria-hidden="true" />
          Criar card
        </button>
      </div>
    </form>
  );
}
