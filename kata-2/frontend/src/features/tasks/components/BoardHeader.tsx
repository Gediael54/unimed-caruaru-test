import { CheckCircle2, Clock3, Flag, ListTodo, Lock, ShieldCheck } from "lucide-react";
import type { TaskSummary } from "../model/task.types";

type BoardHeaderProps = {
  isRefreshing: boolean;
  summary: TaskSummary;
};

export function BoardHeader({ isRefreshing, summary }: BoardHeaderProps) {
  return (
    <section className="board-header" aria-labelledby="page-title">
      <div className="board-header-copy">
        <p className="eyebrow">Workspace interno · Unimed Caruaru</p>
        <h1 id="page-title">
          Board de operação diária inspirado em fluxo de cards profissional
        </h1>
        <p className="page-subtitle">
          O board principal concentra cards, prioridade, andamento, encerramento e arquivamento
          seguro sem transformar a tela em uma todo-list simples.
        </p>
        <div className="header-chips" aria-label="Contexto do board">
          <span className="header-chip">
            <ShieldCheck size={14} aria-hidden="true" />
            Workspace visível
          </span>
          <span className="header-chip">
            <Lock size={14} aria-hidden="true" />
            Sessão local simulada
          </span>
          <span className="header-chip">Soft delete operacional</span>
        </div>
        <p className="board-status" role="status">
          {isRefreshing ? "Sincronizando board e API..." : "API conectada e board em dia."}
        </p>
      </div>
      <dl className="summary-grid" aria-label="Resumo das tarefas">
        <div className="summary-card">
          <span className="icon-badge neutral" aria-hidden="true">
            <ListTodo size={20} />
          </span>
          <div>
            <dt>Ativas</dt>
            <dd>{summary.total}</dd>
          </div>
        </div>
        <div className="summary-card">
          <span className="icon-badge warning" aria-hidden="true">
            <Clock3 size={20} />
          </span>
          <div>
            <dt>Em andamento</dt>
            <dd>{summary.inProgress}</dd>
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
        <div className="summary-card">
          <span className="icon-badge danger-soft" aria-hidden="true">
            <Flag size={20} />
          </span>
          <div>
            <dt>Alta prioridade</dt>
            <dd>{summary.highPriority}</dd>
          </div>
        </div>
      </dl>
    </section>
  );
}
