-- Kata 2 - Evolucao de persistencia.
--
-- Hoje a Kata 2 roda com InMemoryTaskRepository em backend/.
-- Este arquivo documenta a proposta de schema para quando a persistencia
-- for movida para SQLite (monousuario) ou Postgres (multiusuario). O DDL
-- abaixo e compativel com ambos e espelha exatamente o modelo atual em
-- backend/Models/BoardTask.cs.
--
-- Projetado para Postgres (que ja suporta gen_random_uuid, timestamptz,
-- CHECK e indices parciais). Os comentarios apontam o equivalente SQLite
-- onde o dialeto difere.

-- Postgres: habilita gen_random_uuid(); em SQLite a aplicacao gera o GUID.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS board_task (
    -- SQLite: TEXT PRIMARY KEY (GUID gerado pela aplicacao).
    id           UUID         NOT NULL DEFAULT gen_random_uuid(),
    title        VARCHAR(120) NOT NULL,
    description  VARCHAR(600),
    priority     VARCHAR(16)  NOT NULL DEFAULT 'medium',
    status       VARCHAR(16)  NOT NULL,
    -- SQLite: TEXT com ISO-8601 em UTC; Postgres mantem timestamptz.
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    archived_at  TIMESTAMPTZ,
    CONSTRAINT pk_board_task PRIMARY KEY (id),
    CONSTRAINT ck_board_task_title_not_blank CHECK (length(btrim(title)) > 0),
    CONSTRAINT ck_board_task_priority_allowed CHECK (priority IN ('low', 'medium', 'high')),
    CONSTRAINT ck_board_task_status_allowed CHECK (
        status IN ('pending', 'in_progress', 'completed', 'cancelled', 'archived')
    ),
    CONSTRAINT ck_board_task_updated_after_created CHECK (updated_at >= created_at),
    CONSTRAINT ck_board_task_archived_consistency CHECK (
        (status = 'archived' AND archived_at IS NOT NULL)
        OR (status <> 'archived' AND archived_at IS NULL)
    )
);

-- Filtro GET /tasks?status=pending|in_progress|completed|cancelled|archived.
CREATE INDEX IF NOT EXISTS ix_board_task_status ON board_task (status);

-- Timeline/Recentes no frontend ordena por updated_at desc.
CREATE INDEX IF NOT EXISTS ix_board_task_updated_at ON board_task (updated_at DESC);

-- Listagem principal do board usa apenas cards ativos.
CREATE INDEX IF NOT EXISTS ix_board_task_active_board
    ON board_task (status, priority, updated_at DESC)
    WHERE archived_at IS NULL;

-- Arquivo pode ser consultado separadamente sem misturar ao board ativo.
CREATE INDEX IF NOT EXISTS ix_board_task_archived_at
    ON board_task (archived_at DESC)
    WHERE archived_at IS NOT NULL;

-- Evolucao para multiusuario (secao 4 de ENGENHARIA.md):
--   ALTER TABLE board_task ADD COLUMN owner_id UUID NOT NULL;
--   CREATE INDEX ix_board_task_owner ON board_task (owner_id, status);
--   -- Todas as queries passam a escopar por owner_id.
