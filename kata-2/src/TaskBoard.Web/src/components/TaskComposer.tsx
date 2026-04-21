import { FormEvent, useState } from "react";
import { Plus } from "lucide-react";

type TaskComposerProps = {
  disabled: boolean;
  onSubmit: (title: string) => Promise<boolean>;
};

export function TaskComposer({ disabled, onSubmit }: TaskComposerProps) {
  const [title, setTitle] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const wasCreated = await onSubmit(title);

    if (wasCreated) {
      setTitle("");
    }
  }

  return (
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
        <button disabled={disabled} type="submit">
          <Plus size={18} aria-hidden="true" />
          Adicionar
        </button>
      </div>
    </form>
  );
}
