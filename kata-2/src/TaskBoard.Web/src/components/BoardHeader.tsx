import { CheckCircle2, ClipboardList, Clock, ListTodo } from "lucide-react";
import type { TaskSummary } from "../task-board";

type BoardHeaderProps = {
  isRefreshing: boolean;
  summary: TaskSummary;
};

export function BoardHeader({ isRefreshing, summary }: BoardHeaderProps) {
  return (
    <>
      <header className="site-header">
        <span className="brand-mark" aria-hidden="true">
          <ClipboardList size={22} />
        </span>
        <span className="brand-text">
          <strong>Board Assistencial</strong>
          <span>Unimed Caruaru</span>
        </span>
      </header>

      <section className="board-header" aria-labelledby="page-title">
        <div>
          <p className="eyebrow">Painel de Tarefas</p>
          <h1 id="page-title">Organize o trabalho do dia com leitura clara do fluxo</h1>
          <p className="page-subtitle">
            Cadastre, acompanhe e finalize atividades com uma visão rápida do que está
            pendente e do que já foi concluído.
          </p>
          <p className="board-status" role="status">
            {isRefreshing ? "Sincronizando tarefas..." : "Painel sincronizado com a API."}
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
    </>
  );
}
