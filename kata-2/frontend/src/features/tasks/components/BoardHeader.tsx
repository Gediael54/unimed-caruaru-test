import { Plus } from "lucide-react";
import type { TaskSummary } from "../model/task.types";

type BoardHeaderProps = {
  filterLabel: string;
  isRefreshing: boolean;
  summary: TaskSummary;
  onCreateTask: () => void;
  viewLabel: string;
  visibleCount: number;
};

export function BoardHeader({
  filterLabel,
  isRefreshing,
  summary,
  onCreateTask,
  viewLabel,
  visibleCount
}: BoardHeaderProps) {
  return (
    <header className="board-header" aria-labelledby="page-title">
      <div className="board-header-topline">
        <div className="board-brand">
          <span className="board-brand-mark" aria-hidden="true">U</span>
          <span>Unimed Caruaru</span>
        </div>
        <div className="board-breadcrumb">
          <span>Projetos</span>
          <span aria-hidden="true">/</span>
          <span>TaskBoard</span>
          <span aria-hidden="true">/</span>
          <span>Board</span>
        </div>
        <div className="board-header-capsules" aria-label="Recorte atual do board">
          <span className="board-header-chip">Filtro: {filterLabel}</span>
          <span className="board-header-chip">Visualização: {viewLabel}</span>
          <span className="board-header-chip">Visíveis: {visibleCount}</span>
        </div>
      </div>
      <div className="board-header-main">
        <div className="board-header-title">
          <span className="board-header-eyebrow">Workspace interno · gestão operacional</span>
          <h1 id="page-title">Board de tarefas</h1>
          <p className="board-subtitle">
            Quadro operacional com leitura rápida, filtros salvos e detalhe por card sem tirar o
            fluxo principal do centro da tela.
          </p>
          <p className="board-status" role="status">
            {isRefreshing ? "Sincronizando board e API..." : "API conectada e board em dia."}
          </p>
        </div>
        <div className="board-header-actions">
          <button className="primary primary--hero" onClick={onCreateTask} type="button">
            <Plus size={16} aria-hidden="true" />
            Novo card
          </button>
        </div>
      </div>
      <dl className="board-summary" aria-label="Resumo das tarefas">
        <div className="summary-item">
          <dt>Ativas</dt>
          <dd>{summary.total}</dd>
          <span className="summary-caption">Cards no board visível</span>
        </div>
        <div className="summary-item">
          <dt>Em andamento</dt>
          <dd>{summary.inProgress}</dd>
          <span className="summary-caption">Fluxo já iniciado</span>
        </div>
        <div className="summary-item">
          <dt>Concluídas</dt>
          <dd>{summary.completed}</dd>
          <span className="summary-caption">Entregas finalizadas</span>
        </div>
        <div className="summary-item">
          <dt>Alta prioridade</dt>
          <dd>{summary.highPriority}</dd>
          <span className="summary-caption">Demandas críticas do ciclo</span>
        </div>
      </dl>
    </header>
  );
}
