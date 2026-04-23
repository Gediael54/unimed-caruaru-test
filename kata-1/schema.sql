-- Schema SQL da Kata 1.
-- Modela pacientes, filas, atendimentos e uma VIEW que reproduz as regras de
-- priorização no banco. Escrito para SQLite, com notas de portabilidade
-- apenas onde a sintaxe diverge de outros dialetos comuns.

PRAGMA foreign_keys = ON;

-- -----------------------------------------------------------------------------
-- Tabela de lookup: níveis de urgência.
-- Evita string mágica espalhada e permite rank numérico estável para ORDER BY.
-- PORTABILIDADE: em PostgreSQL poderia ser CREATE TYPE ... AS ENUM.
-- -----------------------------------------------------------------------------
CREATE TABLE urgency_levels (
    code             TEXT    PRIMARY KEY,
    numeric_priority INTEGER NOT NULL UNIQUE
                             CHECK (numeric_priority BETWEEN 1 AND 4),
    description      TEXT    NOT NULL
);

INSERT INTO urgency_levels (code, numeric_priority, description) VALUES
    ('BAIXA',   1, 'Casos não urgentes, atendimento por ordem de chegada.'),
    ('MÉDIA',   2, 'Urgência moderada, sem risco imediato.'),
    ('ALTA',    3, 'Urgência alta, atendimento preferencial.'),
    ('CRÍTICA', 4, 'Risco imediato à vida, prioridade máxima.');

-- -----------------------------------------------------------------------------
-- Profissionais de saúde que realizam o atendimento.
-- -----------------------------------------------------------------------------
CREATE TABLE doctors (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    registration  TEXT NOT NULL UNIQUE,           -- CRM ou equivalente
    specialty     TEXT,                           -- opcional para generalistas
    active        INTEGER NOT NULL DEFAULT 1
                         CHECK (active IN (0, 1)),
    created_at    TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    updated_at    TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

-- Índice para lookup por CRM (consulta comum no front-desk).
CREATE INDEX idx_doctors_registration_active ON doctors(active, registration);

-- -----------------------------------------------------------------------------
-- Pacientes.
-- Trade-off: a coluna `age` é mantida por fidelidade ao enunciado, que fornece
-- a idade como entrada direta. Em produção, `birthdate` seria a fonte de
-- verdade e a idade derivada; deixamos ambos para refletir essa evolução.
-- -----------------------------------------------------------------------------
CREATE TABLE patients (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    age          INTEGER NOT NULL CHECK (age >= 0 AND age <= 130),
    document     TEXT UNIQUE,                       -- CPF/RG, opcional
    birthdate    TEXT,                              -- ISO date YYYY-MM-DD
    phone        TEXT,
    created_at   TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    updated_at   TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

-- Busca por nome em recepção (prefixo/like).
CREATE INDEX idx_patients_name ON patients(name);

-- -----------------------------------------------------------------------------
-- Sessão de fila de triagem.
-- Uma fila é uma unidade de agrupamento por data e turno (manhã/tarde/noite).
-- Permite ter filas paralelas (por médico ou especialidade, por exemplo) sem
-- confundir pacientes de turnos diferentes.
-- -----------------------------------------------------------------------------
CREATE TABLE triage_queues (
    id            TEXT PRIMARY KEY,
    session_date  TEXT NOT NULL,                    -- ISO date YYYY-MM-DD
    shift         TEXT NOT NULL
                         CHECK (shift IN ('MANHA', 'TARDE', 'NOITE')),
    status        TEXT NOT NULL DEFAULT 'OPEN'
                         CHECK (status IN ('OPEN', 'CLOSED')),
    opened_at     TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    closed_at     TEXT,
    UNIQUE (session_date, shift),
    CHECK (closed_at IS NULL OR closed_at >= opened_at)
);

CREATE INDEX idx_triage_queues_date_status
    ON triage_queues(session_date, status);

-- -----------------------------------------------------------------------------
-- Entrada do paciente numa fila de triagem.
-- Guarda a urgência declarada pela recepção (`urgency_code`) e a urgência
-- efetiva após as regras 4 e 5 (`adjusted_urgency_code`). Manter as duas
-- preserva a trilha de auditoria: é possível responder "por que este paciente
-- subiu de nível?" comparando as duas colunas.
-- -----------------------------------------------------------------------------
CREATE TABLE triage_queue_entries (
    id                     TEXT PRIMARY KEY,
    queue_id               TEXT NOT NULL
                                REFERENCES triage_queues(id) ON DELETE CASCADE,
    patient_id             TEXT NOT NULL
                                REFERENCES patients(id) ON DELETE RESTRICT,
    urgency_code           TEXT NOT NULL
                                REFERENCES urgency_levels(code) ON UPDATE CASCADE,
    adjusted_urgency_code  TEXT NOT NULL
                                REFERENCES urgency_levels(code) ON UPDATE CASCADE,
    arrived_at             TEXT NOT NULL,            -- ISO 8601 timestamp
    sequence_number        INTEGER NOT NULL,         -- ordem monotônica de inserção na fila
    status                 TEXT NOT NULL DEFAULT 'WAITING'
                                CHECK (status IN ('WAITING', 'CALLED',
                                                  'IN_ATTENDANCE', 'COMPLETED',
                                                  'NO_SHOW')),
    notes                  TEXT,
    created_at             TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    updated_at             TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    UNIQUE (queue_id, patient_id),                  -- um paciente por fila
    UNIQUE (queue_id, sequence_number)              -- posição única por fila
);

-- Índice composto voltado à consulta operacional da fila:
-- acelera o filtro por fila + status e mantém o desempate estável por ordem
-- de chegada e sequência de inserção. A prioridade clínica final continua
-- vindo da regra de negócio exposta na VIEW.
CREATE INDEX idx_queue_entries_ordering
    ON triage_queue_entries(
        queue_id,
        status,
        adjusted_urgency_code,
        arrived_at,
        sequence_number
    );

CREATE INDEX idx_queue_entries_patient
    ON triage_queue_entries(patient_id);

-- -----------------------------------------------------------------------------
-- Atendimento realizado.
-- Liga-se à entrada da fila (1:1) garantindo que só pode existir um
-- atendimento por entrada; ao profissional que atendeu; e ao paciente. O
-- paciente também poderia ser inferido via entry, mas mantemos o FK explícito
-- para simplificar relatórios.
-- -----------------------------------------------------------------------------
CREATE TABLE appointments (
    id              TEXT PRIMARY KEY,
    queue_entry_id  TEXT NOT NULL UNIQUE
                         REFERENCES triage_queue_entries(id) ON DELETE RESTRICT,
    patient_id      TEXT NOT NULL
                         REFERENCES patients(id) ON DELETE RESTRICT,
    doctor_id       TEXT NOT NULL
                         REFERENCES doctors(id) ON DELETE RESTRICT,
    started_at      TEXT NOT NULL,                  -- ISO 8601 timestamp
    ended_at        TEXT,
    outcome         TEXT CHECK (outcome IN ('ATTENDED', 'REFERRED', 'LEFT')),
    notes           TEXT,
    created_at      TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    updated_at      TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    CHECK (ended_at IS NULL OR ended_at >= started_at)
);

CREATE INDEX idx_appointments_doctor_time
    ON appointments(doctor_id, started_at);

CREATE INDEX idx_appointments_patient
    ON appointments(patient_id);

-- =============================================================================
-- VIEW: fila ordenada aplicando regras 4 e 5 do enunciado.
--
-- A VIEW expõe a mesma lógica da função Python `order_triage_queue` para que
-- consultas diretas ao banco obtenham a fila correta sem precisar passar pela
-- aplicação. A coluna `adjusted_urgency_computed` é calculada a partir da
-- urgência declarada e da idade do paciente, ignorando o valor persistido em
-- `adjusted_urgency_code` — isso permite validar divergências caso a
-- aplicação tenha persistido um valor incorreto.
--
-- Ordenação:
--   1. urgência ajustada desc (CRÍTICA > ALTA > MÉDIA > BAIXA)
--   2. arrived_at asc      (FIFO)
--   3. sequence_number asc (desempate determinístico final)
-- =============================================================================
CREATE VIEW v_triage_queue_ordered AS
WITH computed AS (
    SELECT
        e.id         AS entry_id,
        e.queue_id,
        e.patient_id,
        p.name       AS patient_name,
        p.age,
        e.urgency_code          AS declared_urgency,
        e.adjusted_urgency_code AS stored_adjusted_urgency,
        CASE
            WHEN p.age < 18 AND e.urgency_code = 'CRÍTICA' THEN 'CRÍTICA'
            WHEN p.age < 18 AND e.urgency_code = 'ALTA'    THEN 'CRÍTICA'
            WHEN p.age < 18 AND e.urgency_code = 'MÉDIA'   THEN 'ALTA'
            WHEN p.age < 18 AND e.urgency_code = 'BAIXA'   THEN 'MÉDIA'
            WHEN p.age >= 60 AND e.urgency_code = 'MÉDIA'  THEN 'ALTA'
            ELSE e.urgency_code
        END          AS adjusted_urgency_computed,
        e.arrived_at,
        e.sequence_number,
        e.status
    FROM triage_queue_entries e
    JOIN patients p ON p.id = e.patient_id
)
SELECT
    c.entry_id,
    c.queue_id,
    c.patient_id,
    c.patient_name,
    c.age,
    c.declared_urgency,
    c.stored_adjusted_urgency,
    c.adjusted_urgency_computed,
    u.numeric_priority AS adjusted_priority,
    c.arrived_at,
    c.sequence_number,
    c.status
FROM computed c
JOIN urgency_levels u ON u.code = c.adjusted_urgency_computed
ORDER BY
    u.numeric_priority DESC,
    c.arrived_at        ASC,
    c.sequence_number   ASC;

-- -----------------------------------------------------------------------------
-- Query exemplo reproduzindo a ordenação diretamente, sem depender da VIEW.
-- Para explicar a regra em relatórios, auditoria ou troubleshooting:
--
-- SELECT
--     e.queue_id,
--     p.name AS patient_name,
--     e.urgency_code AS declared_urgency,
--     CASE
--         WHEN p.age < 18 AND e.urgency_code = 'CRÍTICA' THEN 'CRÍTICA'
--         WHEN p.age < 18 AND e.urgency_code = 'ALTA'    THEN 'CRÍTICA'
--         WHEN p.age < 18 AND e.urgency_code = 'MÉDIA'   THEN 'ALTA'
--         WHEN p.age < 18 AND e.urgency_code = 'BAIXA'   THEN 'MÉDIA'
--         WHEN p.age >= 60 AND e.urgency_code = 'MÉDIA'  THEN 'ALTA'
--         ELSE e.urgency_code
--     END AS adjusted_urgency,
--     e.arrived_at,
--     e.sequence_number
-- FROM triage_queue_entries e
-- JOIN patients p ON p.id = e.patient_id
-- JOIN urgency_levels u ON u.code = CASE
--     WHEN p.age < 18 AND e.urgency_code = 'CRÍTICA' THEN 'CRÍTICA'
--     WHEN p.age < 18 AND e.urgency_code = 'ALTA'    THEN 'CRÍTICA'
--     WHEN p.age < 18 AND e.urgency_code = 'MÉDIA'   THEN 'ALTA'
--     WHEN p.age < 18 AND e.urgency_code = 'BAIXA'   THEN 'MÉDIA'
--     WHEN p.age >= 60 AND e.urgency_code = 'MÉDIA'  THEN 'ALTA'
--     ELSE e.urgency_code
-- END
-- WHERE e.queue_id = :queue_id
-- ORDER BY u.numeric_priority DESC, e.arrived_at ASC, e.sequence_number ASC;
-- -----------------------------------------------------------------------------
