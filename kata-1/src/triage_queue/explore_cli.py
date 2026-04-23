from __future__ import annotations

import argparse
import math
import os
import sqlite3
import sys
import uuid
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from pathlib import Path
from time import perf_counter

from .domain import (
    PRIORITY_URGENCY,
    Patient,
    TriageBucketQueue,
    calculate_adjusted_priority,
    canonical_urgency,
    order_triage_queue,
    parse_arrival_time,
)


KATA_DIR = Path(__file__).resolve().parents[2]
SCHEMA_PATH = KATA_DIR / "schema.sql"
DEMO_REFERENCE_DATE = date(2026, 4, 20)
DEMO_BASE_TIME = datetime(2026, 4, 20, 8, 0)
DEMO_QUEUE_DATE = DEMO_REFERENCE_DATE.isoformat()
DEMO_QUEUE_SHIFT = "MANHA"
REPORT_WIDTH = 78
FULL_RULE = "=" * REPORT_WIDTH
THIN_RULE = "-" * REPORT_WIDTH
NAIVE_EXACT_LIMIT = 2_000


class _Theme:
    def header(self, text: str) -> str:
        raise NotImplementedError

    def muted(self, text: str) -> str:
        raise NotImplementedError

    def success(self, text: str) -> str:
        raise NotImplementedError

    def failure(self, text: str) -> str:
        raise NotImplementedError

    def warning(self, text: str) -> str:
        raise NotImplementedError

    def info(self, text: str) -> str:
        raise NotImplementedError


class _AnsiTheme(_Theme):
    def _wrap(self, text: str, code: str) -> str:
        return f"\033[{code}m{text}\033[0m"

    def header(self, text: str) -> str:
        return self._wrap(text, "1;38;5;29")

    def muted(self, text: str) -> str:
        return self._wrap(text, "2")

    def success(self, text: str) -> str:
        return self._wrap(text, "32")

    def failure(self, text: str) -> str:
        return self._wrap(text, "31")

    def warning(self, text: str) -> str:
        return self._wrap(text, "33")

    def info(self, text: str) -> str:
        return self._wrap(text, "36")


class _PlainTheme(_Theme):
    def header(self, text: str) -> str:
        return text

    def muted(self, text: str) -> str:
        return text

    def success(self, text: str) -> str:
        return text

    def failure(self, text: str) -> str:
        return text

    def warning(self, text: str) -> str:
        return text

    def info(self, text: str) -> str:
        return text


def _color_is_supported() -> bool:
    return (
        sys.stdout.isatty()
        and os.environ.get("NO_COLOR") is None
        and os.environ.get("TERM", "") not in ("", "dumb")
    )


def _pick_theme() -> _Theme:
    return _AnsiTheme() if _color_is_supported() else _PlainTheme()


theme = _pick_theme()


@dataclass(frozen=True)
class ExplorerCase:
    key: str
    title: str
    focus: str
    patients: tuple[Patient, ...]
    expected_order: tuple[str, ...] = ()
    expected_adjustments: tuple[tuple[str, str], ...] = ()
    compare_sql: bool = False

    @property
    def uses_order_validation(self) -> bool:
        return bool(self.expected_order)

    @property
    def uses_adjustment_validation(self) -> bool:
        return bool(self.expected_adjustments)


def section(title: str) -> None:
    print()
    print(theme.header(FULL_RULE))
    print(theme.header(f"  {title}"))
    print(theme.header(FULL_RULE))


def thin_rule() -> None:
    print(theme.muted(THIN_RULE))


def bullet(status: str, text: str) -> None:
    palette = {
        "OK": theme.success,
        "FAIL": theme.failure,
        "WARN": theme.warning,
        "INFO": theme.info,
    }
    painter = palette.get(status, theme.info)
    print(f"  [{painter(status)}] {text}")


def print_table(title: str, headers: tuple[str, ...], rows: list[tuple[str, ...]]) -> None:
    normalized_rows = [tuple(str(cell) for cell in row) for row in rows]
    widths = [len(header) for header in headers]
    for row in normalized_rows:
        widths = [max(widths[index], len(cell)) for index, cell in enumerate(row)]

    print(f"  {title}")
    print("    " + "  ".join(
        f"{header:<{widths[index]}}" for index, header in enumerate(headers)
    ))
    print("    " + "  ".join("-" * width for width in widths))
    for row in normalized_rows:
        print("    " + "  ".join(
            f"{cell:<{widths[index]}}" for index, cell in enumerate(row)
        ))


def demo_patient(
    name: str,
    age: int,
    urgency: str,
    *,
    minutes: int | None = None,
    arrival_time: str | datetime | None = None,
    patient_id: str | None = None,
) -> Patient:
    if arrival_time is None:
        arrival_time = DEMO_BASE_TIME + timedelta(minutes=minutes or 0)
    return Patient(
        id=patient_id or name.lower(),
        name=name,
        age=age,
        urgency=urgency,
        arrival_time=arrival_time,
    )


def adjusted_label(patient: Patient) -> str:
    return PRIORITY_URGENCY[calculate_adjusted_priority(patient)]


def arrival_label(patient: Patient, *, today: date = DEMO_REFERENCE_DATE) -> str:
    return parse_arrival_time(patient.arrival_time, today=today).strftime("%H:%M")


def patient_snapshot_rows(
    patients: tuple[Patient, ...], *, today: date = DEMO_REFERENCE_DATE
) -> list[tuple[str, ...]]:
    return [
        (
            str(position),
            patient.name,
            str(patient.age),
            canonical_urgency(patient.urgency),
            adjusted_label(patient),
            arrival_label(patient, today=today),
        )
        for position, patient in enumerate(patients, start=1)
    ]


def ordered_rows(ordered_patients: list) -> tuple[list[str], list[tuple[str, ...]]]:
    names: list[str] = []
    rows: list[tuple[str, ...]] = []
    for position, item in enumerate(ordered_patients, start=1):
        names.append(item.patient.name)
        rows.append(
            (
                str(position),
                item.patient.name,
                item.canonical_urgency,
                item.adjusted_urgency,
                item.parsed_arrival_time.strftime("%H:%M"),
            )
        )
    return names, rows


def build_cases() -> list[ExplorerCase]:
    return [
        ExplorerCase(
            key="rule-1",
            title="Caso 1 · Regra 1 — CRÍTICA sempre tem prioridade máxima",
            focus="Mesmo chegando depois, o paciente crítico precisa subir para o topo da fila.",
            patients=(
                demo_patient("Aline", 35, "BAIXA", minutes=0),
                demo_patient("Breno", 40, "ALTA", minutes=1),
                demo_patient("Caio", 29, "CRÍTICA", minutes=10),
                demo_patient("Dora", 50, "MÉDIA", minutes=2),
            ),
            expected_order=("Caio", "Breno", "Dora", "Aline"),
        ),
        ExplorerCase(
            key="rule-2",
            title="Caso 2 · Regra 2 — ALTA vence MÉDIA e BAIXA",
            focus="Sem pacientes críticos, ALTA precisa liderar a fila mesmo chegando depois.",
            patients=(
                demo_patient("Elias", 41, "MÉDIA", minutes=0),
                demo_patient("Fabio", 36, "BAIXA", minutes=1),
                demo_patient("Giulia", 33, "ALTA", minutes=10),
                demo_patient("Helena", 39, "MÉDIA", minutes=2),
            ),
            expected_order=("Giulia", "Elias", "Helena", "Fabio"),
        ),
        ExplorerCase(
            key="fifo",
            title="Caso 3A · Regra 3 — FIFO por horário dentro do mesmo nível",
            focus="Com a mesma urgência final, o desempate precisa respeitar o horário de chegada.",
            patients=(
                demo_patient("Ivan", 28, "ALTA", minutes=12),
                demo_patient("Joana", 31, "ALTA", minutes=5),
                demo_patient("Kelly", 34, "ALTA", minutes=9),
            ),
            expected_order=("Joana", "Kelly", "Ivan"),
        ),
        ExplorerCase(
            key="tie",
            title="Caso 3B · Regra 3 — empate exato preserva ordem de entrada",
            focus="Com mesmo horário e mesma urgência, a implementação mantém a ordem original.",
            patients=(
                demo_patient("Amanda", 40, "ALTA", arrival_time="09:10"),
                demo_patient("Bianca", 42, "ALTA", arrival_time="09:10"),
                demo_patient("Carolina", 39, "ALTA", arrival_time="09:10"),
            ),
            expected_order=("Amanda", "Bianca", "Carolina"),
        ),
        ExplorerCase(
            key="elderly",
            title="Caso 4 · Regra 4 — 59 nao sobe, 60 sobe",
            focus="O objetivo aqui é provar o gatilho em 60 anos e a borda em 59.",
            patients=(
                demo_patient("Nora", 59, "MÉDIA", minutes=20),
                demo_patient("Omar", 60, "MÉDIA", minutes=21),
                demo_patient("Paula", 72, "ALTA", minutes=22),
                demo_patient("Rui", 70, "CRÍTICA", minutes=23),
            ),
            expected_adjustments=(
                ("Nora", "MÉDIA"),
                ("Omar", "ALTA"),
                ("Paula", "ALTA"),
                ("Rui", "CRÍTICA"),
            ),
        ),
        ExplorerCase(
            key="minor",
            title="Caso 5 · Regra 5 — menor de 18 anos ganha +1 nível",
            focus="O cenário cobre promoção em todos os níveis, teto em CRÍTICA e borda de 18 anos.",
            patients=(
                demo_patient("Igor", 17, "BAIXA", minutes=30),
                demo_patient("Julia", 15, "MÉDIA", minutes=31),
                demo_patient("Kai", 16, "ALTA", minutes=32),
                demo_patient("Lia", 10, "CRÍTICA", minutes=33),
                demo_patient("Mara", 18, "BAIXA", minutes=34),
            ),
            expected_adjustments=(
                ("Igor", "MÉDIA"),
                ("Julia", "ALTA"),
                ("Kai", "CRÍTICA"),
                ("Lia", "CRÍTICA"),
                ("Mara", "BAIXA"),
            ),
        ),
        ExplorerCase(
            key="combined",
            title="Caso 6 · Regras combinadas + paridade Python x SQL",
            focus="Mistura regras 1, 3, 4 e 5 para provar ordenação final completa e equivalência com a VIEW SQL.",
            patients=(
                demo_patient("Alice", 30, "MÉDIA", minutes=0, patient_id="alice"),
                demo_patient("Bruno", 65, "MÉDIA", minutes=5, patient_id="bruno"),
                demo_patient("Carla", 15, "MÉDIA", minutes=10, patient_id="carla"),
                demo_patient("David", 10, "CRÍTICA", minutes=15, patient_id="david"),
                demo_patient("Eva", 25, "CRÍTICA", minutes=20, patient_id="eva"),
                demo_patient("Felipe", 80, "CRÍTICA", minutes=25, patient_id="felipe"),
                demo_patient("Gabi", 40, "BAIXA", minutes=30, patient_id="gabi"),
            ),
            expected_order=("David", "Eva", "Felipe", "Bruno", "Carla", "Alice", "Gabi"),
            compare_sql=True,
        ),
        ExplorerCase(
            key="normalization",
            title="Caso 7 · Normalizacao de entrada + ordenacao final",
            focus="O foco é provar que parsing e normalização preservam o contrato do domínio.",
            patients=(
                demo_patient("Diego", 16, "medium", arrival_time="09:20"),
                demo_patient("Elisa", 30, "CRITICA", arrival_time="2026-04-20T09:15:00"),
                demo_patient("Fernanda", 61, "MEDIUM", arrival_time="09:18"),
            ),
            expected_order=("Elisa", "Fernanda", "Diego"),
        ),
    ]


def case_catalog() -> dict[str, ExplorerCase]:
    return {case.key: case for case in build_cases()}


def sql_order_for_patients(patients: tuple[Patient, ...]) -> list[str]:
    conn = sqlite3.connect(":memory:")
    conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
    queue_id = str(uuid.uuid4())
    conn.execute(
        "INSERT INTO triage_queues (id, session_date, shift) VALUES (?, ?, ?)",
        (queue_id, DEMO_QUEUE_DATE, DEMO_QUEUE_SHIFT),
    )

    for index, patient in enumerate(patients):
        patient_id = patient.id or f"{patient.name.lower()}-{index}"
        conn.execute(
            "INSERT INTO patients (id, name, age) VALUES (?, ?, ?)",
            (patient_id, patient.name, patient.age),
        )
        conn.execute(
            """
            INSERT INTO triage_queue_entries (
                id, queue_id, patient_id, urgency_code,
                adjusted_urgency_code, arrived_at, sequence_number
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                str(uuid.uuid4()),
                queue_id,
                patient_id,
                canonical_urgency(patient.urgency),
                adjusted_label(patient),
                parse_arrival_time(patient.arrival_time, today=DEMO_REFERENCE_DATE).isoformat(),
                index,
            ),
        )

    sql_order = [
        row[0]
        for row in conn.execute(
            "SELECT patient_name FROM v_triage_queue_ordered WHERE queue_id = ?",
            (queue_id,),
        )
    ]
    conn.close()
    return sql_order


def render_case(case: ExplorerCase) -> bool:
    section(f"EXPLORAR CASO · {case.title}")
    print(f"  {theme.muted('Foco')}      {case.focus}")
    print(f"  {theme.muted('Chave')}     {case.key}")
    thin_rule()

    print_table(
        "Entrada",
        ("#", "Nome", "Idade", "Declarada", "Final", "Chegada"),
        patient_snapshot_rows(case.patients),
    )
    print()

    if case.uses_order_validation:
        ordered = order_triage_queue(case.patients, today=DEMO_REFERENCE_DATE)
        actual_order, rows = ordered_rows(ordered)
        print_table(
            "Resultado calculado",
            ("#", "Nome", "Declarada", "Final", "Chegada"),
            rows,
        )
        print()
        expected_order = list(case.expected_order)
        ok = actual_order == expected_order
        print_table(
            "Validacao",
            ("Aspecto", "Esperado", "Obtido", "Status"),
            [
                (
                    "ordem final",
                    " > ".join(expected_order),
                    " > ".join(actual_order),
                    "OK" if ok else "FAIL",
                )
            ],
        )
        if case.compare_sql:
            sql_order = sql_order_for_patients(case.patients)
            sql_ok = sql_order == actual_order
            print()
            print_table(
                "Paridade Python x SQL",
                ("Origem", "Ordem", "Status"),
                [
                    ("Python", " > ".join(actual_order), "OK"),
                    ("SQL", " > ".join(sql_order), "OK" if sql_ok else "FAIL"),
                ],
            )
            ok &= sql_ok
        print()
        bullet("OK" if ok else "FAIL", "Caso concluido.")
        return ok

    expected_adjustments = dict(case.expected_adjustments)
    actual_adjustments = {
        patient.name: adjusted_label(patient)
        for patient in case.patients
    }
    rows = [
        (
            name,
            expected_adjustments[name],
            actual_adjustments[name],
            "OK" if expected_adjustments[name] == actual_adjustments[name] else "FAIL",
        )
        for name in expected_adjustments
    ]
    ok = actual_adjustments == expected_adjustments
    print_table("Resultado calculado", ("Nome", "Esperado", "Obtido", "Status"), rows)
    print()
    bullet("OK" if ok else "FAIL", "Caso concluido.")
    return ok


def run_all_cases() -> int:
    results: list[tuple[str, bool]] = []
    for case in build_cases():
        results.append((case.title, render_case(case)))

    section("RESUMO DO EXPLORADOR")
    for title, ok in results:
        bullet("OK" if ok else "FAIL", title)
    return 0 if all(ok for _, ok in results) else 1


def build_synthetic_patients(count: int) -> list[Patient]:
    urgency_cycle = ("BAIXA", "MÉDIA", "ALTA", "CRÍTICA")
    age_cycle = (10, 17, 18, 30, 59, 60, 75)
    base_time = datetime(2026, 4, 20, 7, 0)
    patients: list[Patient] = []
    for index in range(count):
        patients.append(
            Patient(
                id=f"synthetic-{index}",
                name=f"Paciente {index:05d}",
                age=age_cycle[index % len(age_cycle)],
                urgency=urgency_cycle[index % len(urgency_cycle)],
                arrival_time=base_time + timedelta(minutes=index),
            )
        )
    return patients


def format_duration_ms(duration_ms: float) -> str:
    if duration_ms < 1000:
        return f"{duration_ms:.2f} ms"
    seconds = duration_ms / 1000
    if seconds < 60:
        return f"{seconds:.2f} s"
    minutes = seconds / 60
    if minutes < 60:
        return f"{minutes:.2f} min"
    hours = minutes / 60
    if hours < 24:
        return f"{hours:.2f} h"
    return f"{hours / 24:.2f} d"


def classify_duration(duration_ms: float) -> str:
    if duration_ms < 1_000:
        return "adequado"
    if duration_ms < 10_000:
        return "aceitavel"
    if duration_ms < 60_000:
        return "atencao"
    if duration_ms < 3_600_000:
        return "fraco"
    return "inviavel"


def measure_batch_sort(count: int) -> float:
    patients = build_synthetic_patients(count)
    start = perf_counter()
    order_triage_queue(patients)
    return (perf_counter() - start) * 1000


def measure_bucket_queue(count: int) -> tuple[float, float]:
    patients = build_synthetic_patients(count)
    queue = TriageBucketQueue()

    start = perf_counter()
    for patient in patients:
        queue.enqueue(patient)
    enqueue_ms = (perf_counter() - start) * 1000

    start = perf_counter()
    while queue.dequeue_next() is not None:
        pass
    dequeue_ms = (perf_counter() - start) * 1000

    return enqueue_ms, dequeue_ms


def measure_naive_continuous(count: int) -> float:
    patients = build_synthetic_patients(count)
    current_batch: list[Patient] = []
    start = perf_counter()
    for patient in patients:
        current_batch.append(patient)
        order_triage_queue(current_batch)
    return (perf_counter() - start) * 1000


def estimate_naive_continuous(count: int) -> tuple[float, str]:
    baseline = 1_000
    baseline_ms = measure_naive_continuous(baseline)
    estimated_ms = baseline_ms * (
        ((count ** 2) * math.log2(count))
        / ((baseline ** 2) * math.log2(baseline))
    )
    return estimated_ms, f"estimado a partir de {baseline} chegadas"


def run_scale_probe(count: int) -> int:
    section(f"SIMULACAO DE VOLUME · {count} pacientes")
    print(f"  {theme.muted('Entrada')}   lote sintético determinístico com {count} pacientes")
    print(f"  {theme.muted('Objetivo')}  comparar ordenação em lote, fila incremental e cenário contínuo")
    thin_rule()

    batch_ms = measure_batch_sort(count)
    enqueue_ms, dequeue_ms = measure_bucket_queue(count)

    if count <= NAIVE_EXACT_LIMIT:
        naive_ms = measure_naive_continuous(count)
        naive_mode = "medido"
    else:
        naive_ms, naive_mode = estimate_naive_continuous(count)

    print_table(
        "Resultados",
        ("Estrategia", "Tempo", "Modo", "Leitura"),
        [
            ("batch sort", format_duration_ms(batch_ms), "medido", classify_duration(batch_ms)),
            ("bucket enqueue", format_duration_ms(enqueue_ms), "medido", classify_duration(enqueue_ms)),
            ("bucket consume", format_duration_ms(dequeue_ms), "medido", classify_duration(dequeue_ms)),
            ("continuo ingenuo", format_duration_ms(naive_ms), naive_mode, classify_duration(naive_ms)),
        ],
    )
    print()

    if naive_ms > enqueue_ms * 10:
        bullet("OK", "Para operação contínua, a fila incremental fica claramente melhor neste volume.")
    else:
        bullet("INFO", "Neste volume, as estratégias ainda são comparáveis, mas o contínuo degrada primeiro.")

    if count > NAIVE_EXACT_LIMIT:
        print("         -> acima de 2000 chegadas, o modo contínuo ingênuo vira estimativa para manter o explorer responsivo.")
    return 0


def list_cases() -> None:
    section("CASOS DISPONIVEIS")
    for index, case in enumerate(build_cases(), start=1):
        print(f"  [{index}] {case.key:<13} {case.title}")
    print()
    print("  Use `python3 kata-1/explore.py --case <chave>` para rodar um caso direto.")


def _prompt(text: str) -> str:
    try:
        return input(text).strip()
    except EOFError:
        print()
        return "0"


def choose_case_interactively() -> int:
    catalog = build_cases()
    list_cases()
    raw = _prompt("\nEscolha um numero, uma chave ou 0 para voltar: ")
    if raw in {"0", "q", "Q"}:
        return 0

    selected: ExplorerCase | None = None
    if raw.isdigit():
        index = int(raw)
        if 1 <= index <= len(catalog):
            selected = catalog[index - 1]
    else:
        selected = case_catalog().get(raw)

    if selected is None:
        bullet("WARN", "Caso invalido.")
        return 1

    return 0 if render_case(selected) else 1


def choose_volume_interactively() -> int:
    print()
    print("  Volumes sugeridos: 100, 1000, 5000, 10000")
    raw = _prompt("Digite a quantidade de pacientes ou 0 para voltar: ")
    if raw in {"0", "q", "Q"}:
        return 0
    try:
        count = int(raw)
    except ValueError:
        bullet("WARN", "Quantidade invalida.")
        return 1
    if count <= 0:
        bullet("WARN", "A quantidade precisa ser positiva.")
        return 1
    return run_scale_probe(count)


def interactive_loop() -> int:
    while True:
        section("KATA 1 · EXPLORADOR INTERATIVO")
        print("  [1] Rodar todos os casos de negocio")
        print("  [2] Escolher um caso especifico")
        print("  [3] Simular volume do algoritmo")
        print("  [4] Listar chaves dos casos")
        print("  [0] Sair")
        print()

        choice = _prompt("> ")
        if choice in {"0", "q", "Q"}:
            return 0
        if choice == "1":
            run_all_cases()
        elif choice == "2":
            choose_case_interactively()
        elif choice == "3":
            choose_volume_interactively()
        elif choice == "4":
            list_cases()
        else:
            bullet("WARN", "Opcao invalida.")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Explorer interativo da Kata 1 para casos e volume."
    )
    parser.add_argument("--case", help="Roda um caso direto pela chave ou 'all'.")
    parser.add_argument(
        "--size",
        type=int,
        help="Simula um volume customizado de pacientes.",
    )
    parser.add_argument(
        "--list-cases",
        action="store_true",
        help="Lista as chaves disponiveis para exploracao.",
    )
    args = parser.parse_args()

    if args.list_cases:
        list_cases()
        return 0

    if args.case:
        if args.case == "all":
            return run_all_cases()
        case = case_catalog().get(args.case)
        if case is None:
            bullet("FAIL", f"Caso inexistente: {args.case}")
            return 2
        return 0 if render_case(case) else 1

    if args.size is not None:
        if args.size <= 0:
            bullet("FAIL", "A quantidade precisa ser positiva.")
            return 2
        return run_scale_probe(args.size)

    return interactive_loop()


if __name__ == "__main__":
    sys.exit(main())
