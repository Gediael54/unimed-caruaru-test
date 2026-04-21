from __future__ import annotations

import argparse
import dis
import io
import math
import sqlite3
import sys
import trace
import unittest
import uuid
from datetime import date, datetime, timedelta
from pathlib import Path
from time import perf_counter


KATA_DIR = Path(__file__).resolve().parent
TRIAGE_SOURCE = KATA_DIR / "triage.py"
SCHEMA_PATH = KATA_DIR / "schema.sql"
ANALYSIS_PATH = KATA_DIR / "ANALISE.md"

DEFAULT_MODE = "full"
FULL_MODE_SECTION_COUNT = 6
REPORT_WIDTH = 78
SEP = "=" * REPORT_WIDTH
DEMO_REFERENCE_DATE = date(2026, 4, 20)
DEMO_BASE_TIME = datetime(2026, 4, 20, 8, 0)
DEMO_QUEUE_DATE = DEMO_REFERENCE_DATE.isoformat()
DEMO_QUEUE_SHIFT = "MANHA"
DEMO_TIED_ARRIVAL_TIME = "09:10"
DEMO_MIXED_ARRIVAL_TIME = "09:20"
BENCHMARK_REFERENCE_BASE = datetime(2026, 4, 20, 7, 0)
BENCHMARK_BATCH_SIZES = (100, 5_000, 20_000)
BENCHMARK_CONTINUOUS_SIZES = (200, 500, 1_000)
BENCHMARK_PROJECTION_SCALES = tuple(10**exponent for exponent in range(3, 8))


def section(title: str) -> None:
    print()
    print(SEP)
    print(f"  {title}")
    print(SEP)


def bullet(status: str, text: str) -> None:
    print(f"  [{status}] {text}")


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

    days = hours / 24
    return f"{days:.2f} d"


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


def _executable_lines(source_path: Path) -> set[int]:
    source = source_path.read_text(encoding="utf-8")
    root = compile(source, str(source_path), "exec")

    lines: set[int] = set()
    stack = [root]
    while stack:
        code = stack.pop()
        for _, lineno in dis.findlinestarts(code):
            if lineno > 0:
                lines.add(lineno)
        for const in code.co_consts:
            if hasattr(const, "co_consts"):
                stack.append(const)
    return lines


def run_tests_with_coverage() -> dict:
    executable = _executable_lines(TRIAGE_SOURCE)
    tracer = trace.Trace(count=True, trace=False, countfuncs=False)
    container: dict = {}

    def run_under_trace() -> None:
        for mod in ("triage", "test_triage"):
            sys.modules.pop(mod, None)
        loader = unittest.TestLoader()
        suite = loader.loadTestsFromName("test_triage")
        sink = io.StringIO()
        container["result"] = unittest.TextTestRunner(
            stream=sink, verbosity=0
        ).run(suite)
        container["output"] = sink.getvalue()

    start = datetime.now()
    tracer.runfunc(run_under_trace)
    duration = (datetime.now() - start).total_seconds()

    hit = {
        lineno
        for (filename, lineno), count in tracer.results().counts.items()
        if count > 0 and Path(filename).resolve() == TRIAGE_SOURCE.resolve()
    }
    covered = executable & hit
    missing = sorted(executable - hit)
    pct = (len(covered) / len(executable) * 100) if executable else 100.0

    return {
        "result": container["result"],
        "output": container["output"],
        "duration": duration,
        "executable_count": len(executable),
        "covered_count": len(covered),
        "coverage_pct": pct,
        "missing_lines": missing,
    }


def report_tests(info: dict) -> tuple[bool, int]:
    section(f"1/{FULL_MODE_SECTION_COUNT}  EXECUÇÃO DOS TESTES (unitários e de integração)")
    result = info["result"]
    passed = result.wasSuccessful()
    total = result.testsRun
    if passed:
        bullet("OK", f"{total} testes executados, todos passaram em {info['duration']:.2f}s")
    else:
        bullet("FAIL", f"{len(result.failures)} falha(s), {len(result.errors)} erro(s)")
        print(info["output"])
    return passed, total


def report_coverage(info: dict) -> float:
    section(f"2/{FULL_MODE_SECTION_COUNT}  COBERTURA DE CÓDIGO (triage.py)")
    pct = info["coverage_pct"]
    status = "OK" if pct >= 100.0 else "FAIL"
    bullet(status, f"Linhas executáveis: {info['executable_count']}")
    bullet(status, f"Linhas cobertas:    {info['covered_count']}")
    bullet(status, f"Cobertura:          {pct:.2f}%")
    if info["missing_lines"]:
        print(f"  Linhas não cobertas: {info['missing_lines']}")
    return pct


def validate_schema() -> tuple[bool, dict[str, list[str]]]:
    section(f"3/{FULL_MODE_SECTION_COUNT}  VALIDAÇÃO DO SCHEMA SQL (schema.sql)")

    conn = sqlite3.connect(":memory:")
    conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))

    tables = [
        row[0]
        for row in conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        )
    ]
    views = [
        row[0]
        for row in conn.execute(
            "SELECT name FROM sqlite_master WHERE type='view' ORDER BY name"
        )
    ]
    indexes = [
        row[0]
        for row in conn.execute(
            "SELECT name FROM sqlite_master "
            "WHERE type='index' AND name NOT LIKE 'sqlite_autoindex_%' "
            "ORDER BY name"
        )
    ]
    urgency_seed = [
        row[0]
        for row in conn.execute(
            "SELECT code FROM urgency_levels ORDER BY numeric_priority"
        )
    ]
    ordering_index = [
        row[2]
        for row in conn.execute("PRAGMA index_info('idx_queue_entries_ordering')")
    ]

    conn.close()

    bullet("OK", f"Carregamento em SQLite: sucesso")
    bullet("OK", f"Tabelas ({len(tables)}): {', '.join(tables)}")
    bullet("OK", f"Views ({len(views)}): {', '.join(views)}")
    bullet("OK", f"Índices ({len(indexes)}): {', '.join(indexes)}")
    bullet("OK", f"Seed urgency_levels: {' < '.join(urgency_seed)}")
    bullet("OK", f"Índice operacional da fila: {', '.join(ordering_index)}")

    return True, {"tables": tables, "views": views, "indexes": indexes}


def live_demo(*, verbose: bool = True) -> bool:
    section(f"4/{FULL_MODE_SECTION_COUNT}  DEMONSTRAÇÃO: REGRAS DE NEGÓCIO EM OPERAÇÃO")

    from triage import (
        Patient,
        PRIORITY_URGENCY,
        calculate_adjusted_priority,
        canonical_urgency,
        order_triage_queue,
        parse_arrival_time,
    )

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

    def print_case_header(title: str, focus: str) -> None:
        print()
        print(f"  {title}")
        if verbose:
            print(f"  Foco: {focus}")

    def print_case_input(
        patients: list[Patient], *, today: date = DEMO_REFERENCE_DATE
    ) -> None:
        if not verbose:
            return
        print("  Dados usados:")
        for pos, patient in enumerate(patients, 1):
            declared = canonical_urgency(patient.urgency)
            adjusted = adjusted_label(patient)
            transition = (
                "sem ajuste"
                if declared == adjusted
                else f"ajuste {declared} -> {adjusted}"
            )
            print(
                f"    {pos}. {patient.name:<10} idade {patient.age:>2} "
                f"urgência declarada {declared:<8} chegada {arrival_label(patient, today=today)}"
                f"  {transition}"
            )

    def print_case_output(
        ordered_patients: list, *, title: str = "Ordem calculada"
    ) -> list[str]:
        names: list[str] = []
        if verbose:
            print(f"  {title}:")
        for pos, item in enumerate(ordered_patients, 1):
            names.append(item.patient.name)
            if verbose:
                print(
                    f"    {pos}. {item.patient.name:<10} "
                    f"{item.canonical_urgency:<8} -> {item.adjusted_urgency:<8} "
                    f"chegada {item.parsed_arrival_time.strftime('%H:%M')}"
                )
        return names

    def print_adjustment_table(
        patients: list[Patient], *, today: date = DEMO_REFERENCE_DATE
    ) -> dict[str, str]:
        actual: dict[str, str] = {}
        if verbose:
            print("  Ajustes calculados:")
        for patient in patients:
            result = adjusted_label(patient)
            actual[patient.name] = result
            if verbose:
                print(
                    f"    - {patient.name:<10} "
                    f"{canonical_urgency(patient.urgency):<8} -> {result:<8} "
                    f"(chegada {arrival_label(patient, today=today)})"
                )
        return actual

    def verify_expected_order(
        patients: list[Patient],
        expected_order: list[str],
        *,
        reason: str,
        today: date = DEMO_REFERENCE_DATE,
    ) -> bool:
        ordered = order_triage_queue(patients, today=today)
        actual_order = print_case_output(ordered)
        ok = actual_order == expected_order
        bullet("OK" if ok else "FAIL", reason)
        if verbose:
            print(f"         -> esperado: {' > '.join(expected_order)}")
            print(f"         -> obtido:   {' > '.join(actual_order)}")
        else:
            print(f"         -> ordem final: {' > '.join(actual_order)}")
        return ok

    def verify_expected_adjustments(
        patients: list[Patient],
        expected_adjustments: dict[str, str],
        *,
        reason: str,
        today: date = DEMO_REFERENCE_DATE,
    ) -> bool:
        actual_adjustments = print_adjustment_table(patients, today=today)
        ok = actual_adjustments == expected_adjustments
        bullet("OK" if ok else "FAIL", reason)
        if verbose:
            for name, expected in expected_adjustments.items():
                actual = actual_adjustments[name]
                marker = "OK" if actual == expected else "FAIL"
                print(f"         -> [{marker}] {name}: esperado {expected}, obtido {actual}")
        else:
            compact = ", ".join(
                f"{name}={actual_adjustments[name]}"
                for name in expected_adjustments
            )
            print(f"         -> ajustes: {compact}")
        return ok

    all_ok = True

    if verbose:
        print("  A demonstração abaixo está separada por regra para deixar explícitos:")
        print("  [1] os dados usados em cada cenário;")
        print("  [2] o efeito de cada regra sobre a prioridade;")
        print("  [3] a ordem final calculada;")
        print("  [4] a comparação entre resultado esperado e resultado obtido.")
    else:
        print("  Resumo da demonstração executável na validação completa resumida.")
        print("  Para ver datasets, ajustes e ordens detalhadas, use `python3 kata-1/verify.py --mode demo`.")
        print("  Para manter o fluxo completo com esse mesmo nível de detalhe, use `--mode full-verbose`.")

    rule_1_patients = [
        demo_patient("Aline", 35, "BAIXA", minutes=0),
        demo_patient("Breno", 40, "ALTA", minutes=1),
        demo_patient("Caio", 29, "CRÍTICA", minutes=10),
        demo_patient("Dora", 50, "MÉDIA", minutes=2),
    ]
    print_case_header(
        "Caso 1 — Aline, Breno, Caio e Dora — Regra 1: CRÍTICA sempre tem prioridade máxima",
        "Mesmo chegando depois, o paciente crítico deve subir para o topo da fila.",
    )
    print_case_input(rule_1_patients)
    all_ok &= verify_expected_order(
        rule_1_patients,
        ["Caio", "Breno", "Dora", "Aline"],
        reason="Regra 1 validada com paciente crítico chegando depois dos demais.",
    )

    rule_2_patients = [
        demo_patient("Elias", 41, "MÉDIA", minutes=0),
        demo_patient("Fabio", 36, "BAIXA", minutes=1),
        demo_patient("Giulia", 33, "ALTA", minutes=10),
        demo_patient("Helena", 39, "MÉDIA", minutes=2),
    ]
    print_case_header(
        "Caso 2 — Elias, Fabio, Giulia e Helena — Regra 2: ALTA vence MÉDIA e BAIXA",
        "Sem pacientes críticos, a urgência ALTA precisa liderar a fila mesmo com chegada posterior.",
    )
    print_case_input(rule_2_patients)
    all_ok &= verify_expected_order(
        rule_2_patients,
        ["Giulia", "Elias", "Helena", "Fabio"],
        reason="Regra 2 validada com comparação direta entre ALTA, MÉDIA e BAIXA.",
    )

    rule_3_fifo_patients = [
        demo_patient("Ivan", 28, "ALTA", minutes=12),
        demo_patient("Joana", 31, "ALTA", minutes=5),
        demo_patient("Kelly", 34, "ALTA", minutes=9),
    ]
    print_case_header(
        "Caso 3A — Ivan, Joana e Kelly — Regra 3: FIFO por horário dentro do mesmo nível",
        "Todos têm a mesma urgência final; o desempate deve respeitar o horário de chegada.",
    )
    print_case_input(rule_3_fifo_patients)
    all_ok &= verify_expected_order(
        rule_3_fifo_patients,
        ["Joana", "Kelly", "Ivan"],
        reason="Regra 3 validada com mesmo nível de urgência e horários diferentes.",
    )

    rule_3_tie_patients = [
        demo_patient("Amanda", 40, "ALTA", arrival_time=DEMO_TIED_ARRIVAL_TIME),
        demo_patient("Bianca", 42, "ALTA", arrival_time=DEMO_TIED_ARRIVAL_TIME),
        demo_patient("Carolina", 39, "ALTA", arrival_time=DEMO_TIED_ARRIVAL_TIME),
    ]
    print_case_header(
        "Caso 3B — Amanda, Bianca e Carolina — Desempate determinístico para empate exato",
        "Mesmo horário e mesma urgência: a implementação preserva a ordem original de entrada.",
    )
    print_case_input(rule_3_tie_patients)
    all_ok &= verify_expected_order(
        rule_3_tie_patients,
        ["Amanda", "Bianca", "Carolina"],
        reason="Empate exato preservado de forma estável e determinística.",
    )

    rule_4_patients = [
        demo_patient("Nora", 59, "MÉDIA", minutes=20),
        demo_patient("Omar", 60, "MÉDIA", minutes=21),
        demo_patient("Paula", 72, "ALTA", minutes=22),
        demo_patient("Rui", 70, "CRÍTICA", minutes=23),
    ]
    print_case_header(
        "Caso 4 — Nora, Omar, Paula e Rui — Regra 4: 59 não sobe, 60 sobe",
        "O objetivo aqui é provar o gatilho em 60 anos e a borda em 59 anos.",
    )
    print_case_input(rule_4_patients)
    all_ok &= verify_expected_adjustments(
        rule_4_patients,
        {
            "Nora": "MÉDIA",
            "Omar": "ALTA",
            "Paula": "ALTA",
            "Rui": "CRÍTICA",
        },
        reason="Regra 4 validada com borda 59/60 e sem promoção indevida fora de MÉDIA.",
    )

    rule_5_patients = [
        demo_patient("Igor", 17, "BAIXA", minutes=30),
        demo_patient("Julia", 15, "MÉDIA", minutes=31),
        demo_patient("Kai", 16, "ALTA", minutes=32),
        demo_patient("Lia", 10, "CRÍTICA", minutes=33),
        demo_patient("Mara", 18, "BAIXA", minutes=34),
    ]
    print_case_header(
        "Caso 5 — Igor, Julia, Kai, Lia e Mara — Regra 5: menor de 18 anos ganha +1 nível",
        "O cenário cobre subida em BAIXA, MÉDIA, ALTA, o teto em CRÍTICA e a borda de 18 anos.",
    )
    print_case_input(rule_5_patients)
    all_ok &= verify_expected_adjustments(
        rule_5_patients,
        {
            "Igor": "MÉDIA",
            "Julia": "ALTA",
            "Kai": "CRÍTICA",
            "Lia": "CRÍTICA",
            "Mara": "BAIXA",
        },
        reason="Regra 5 validada em todos os níveis e com borda 17/18.",
    )

    combined_patients = [
        demo_patient("Alice", 30, "MÉDIA", minutes=0, patient_id="alice"),
        demo_patient("Bruno", 65, "MÉDIA", minutes=5, patient_id="bruno"),
        demo_patient("Carla", 15, "MÉDIA", minutes=10, patient_id="carla"),
        demo_patient("David", 10, "CRÍTICA", minutes=15, patient_id="david"),
        demo_patient("Eva", 25, "CRÍTICA", minutes=20, patient_id="eva"),
        demo_patient("Felipe", 80, "CRÍTICA", minutes=25, patient_id="felipe"),
        demo_patient("Gabi", 40, "BAIXA", minutes=30, patient_id="gabi"),
    ]
    expected_combined_order = [
        "David",
        "Eva",
        "Felipe",
        "Bruno",
        "Carla",
        "Alice",
        "Gabi",
    ]
    print_case_header(
        "Caso 6 — Alice, Bruno, Carla, David, Eva, Felipe e Gabi — regras combinadas + paridade Python x SQL",
        "Este lote mistura regras 1, 3, 4 e 5 para provar a ordenação final completa e a equivalência com a VIEW do banco.",
    )
    print_case_input(combined_patients)
    ordered = order_triage_queue(combined_patients, today=DEMO_REFERENCE_DATE)
    python_names = print_case_output(ordered, title="Ordem calculada pelo Python")
    python_matches_expected = python_names == expected_combined_order
    bullet(
        "OK" if python_matches_expected else "FAIL",
        "Lote combinado no Python confere com a ordem esperada.",
    )
    if verbose:
        print(f"         -> esperado: {' > '.join(expected_combined_order)}")
        print(f"         -> obtido:   {' > '.join(python_names)}")
    else:
        print(f"         -> ordem final: {' > '.join(python_names)}")
    all_ok &= python_matches_expected

    conn = sqlite3.connect(":memory:")
    conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
    queue_id = str(uuid.uuid4())
    conn.execute(
        "INSERT INTO triage_queues (id, session_date, shift) VALUES (?, ?, ?)",
        (queue_id, DEMO_QUEUE_DATE, DEMO_QUEUE_SHIFT),
    )
    for index, patient in enumerate(combined_patients):
        patient_id = patient.id or str(uuid.uuid4())
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
    if verbose:
        print("  Ordem calculada pela VIEW SQL:")
        for pos, name in enumerate(sql_order, 1):
            print(f"    {pos}. {name}")
    sql_matches_python = sql_order == python_names
    bullet(
        "OK" if sql_matches_python else "FAIL",
        "Python e SQL concordam na fila final do mesmo lote.",
    )
    print(f"         -> Python: {' > '.join(python_names)}")
    print(f"         -> SQL:    {' > '.join(sql_order)}")
    all_ok &= sql_matches_python

    mixed_inputs = [
        demo_patient("Diego", 16, "medium", arrival_time=DEMO_MIXED_ARRIVAL_TIME),
        demo_patient("Elisa", 30, "CRITICA", arrival_time="2026-04-20T09:15:00"),
        demo_patient("Fernanda", 61, "MEDIUM", arrival_time="09:18"),
    ]
    print_case_header(
        "Caso 7 — Diego, Elisa e Fernanda — entradas flexíveis: PT/EN, acento, HH:MM e ISO 8601",
        "Aqui o foco não é uma regra clínica nova, e sim provar que parsing e normalização preservam o contrato do domínio.",
    )
    print_case_input(mixed_inputs)
    mixed_order = order_triage_queue(mixed_inputs, today=DEMO_REFERENCE_DATE)
    mixed_names = print_case_output(mixed_order)
    mixed_ok = mixed_names == ["Elisa", "Fernanda", "Diego"]
    bullet(
        "OK" if mixed_ok else "FAIL",
        "Entradas flexíveis normalizadas corretamente sem quebrar a ordenação final.",
    )
    if verbose:
        print("         -> esperado: Elisa > Fernanda > Diego")
        print(f"         -> obtido:   {' > '.join(mixed_names)}")
    else:
        print(f"         -> ordem final: {' > '.join(mixed_names)}")
    all_ok &= mixed_ok

    print()
    bullet(
        "OK" if all_ok else "FAIL",
        "Demonstração executável concluída com todos os cenários de regra e parsing.",
    )
    return all_ok


def build_synthetic_patients(count: int) -> list:
    from triage import Patient

    urgency_cycle = ("BAIXA", "MÉDIA", "ALTA", "CRÍTICA")
    age_cycle = (10, 17, 18, 30, 59, 60, 75)
    base = BENCHMARK_REFERENCE_BASE
    patients = []
    for index in range(count):
        patients.append(
            Patient(
                id=f"synthetic-{index}",
                name=f"Paciente {index:05d}",
                age=age_cycle[index % len(age_cycle)],
                urgency=urgency_cycle[index % len(urgency_cycle)],
                arrival_time=base + timedelta(minutes=index),
            )
        )
    return patients


def scalability_demo() -> None:
    section(f"5/{FULL_MODE_SECTION_COUNT}  DEMONSTRAÇÃO DE ESCALA E TRADE-OFFS")

    from triage import TriageBucketQueue, order_triage_queue

    print("  Benchmark ilustrativo nesta máquina (não é benchmark científico).")
    print("  Objetivo: mostrar tendência de custo e quando a solução em lote deixa")
    print("  de ser a melhor escolha operacional.\n")

    print("  Lote único conhecido antecipadamente:")
    print("    tamanho | order_triage_queue | enqueue bucket | consumir bucket")
    batch_samples: list[tuple[int, float]] = []
    enqueue_samples: list[tuple[int, float]] = []
    for size in BENCHMARK_BATCH_SIZES:
        patients = build_synthetic_patients(size)

        start = perf_counter()
        order_triage_queue(patients)
        batch_ms = (perf_counter() - start) * 1000

        queue = TriageBucketQueue()
        start = perf_counter()
        for patient in patients:
            queue.enqueue(patient)
        enqueue_ms = (perf_counter() - start) * 1000

        start = perf_counter()
        while queue.dequeue_next() is not None:
            pass
        dequeue_ms = (perf_counter() - start) * 1000
        batch_samples.append((size, batch_ms))
        enqueue_samples.append((size, enqueue_ms))

        print(
            f"    {size:>7} | {batch_ms:>17.2f} ms |"
            f" {enqueue_ms:>13.2f} ms | {dequeue_ms:>14.2f} ms"
        )

    print("\n  Cenário contínuo ingênuo: reordenar toda a lista a cada nova chegada.")
    print("    chegadas | resort completo a cada entrada | enqueue incremental")
    naive_samples: list[tuple[int, float]] = []
    for size in BENCHMARK_CONTINUOUS_SIZES:
        patients = build_synthetic_patients(size)

        current_batch = []
        start = perf_counter()
        for patient in patients:
            current_batch.append(patient)
            order_triage_queue(current_batch)
        naive_ms = (perf_counter() - start) * 1000

        queue = TriageBucketQueue()
        start = perf_counter()
        for patient in patients:
            queue.enqueue(patient)
        incremental_ms = (perf_counter() - start) * 1000
        naive_samples.append((size, naive_ms))

        print(
            f"    {size:>8} | {naive_ms:>32.2f} ms | {incremental_ms:>18.2f} ms"
        )

    print("\n  Projeção por ordem de grandeza (estimativa baseada nas medições acima):")
    print("       escala | batch sort | bucket enqueue | reordenar tudo a cada chegada")

    batch_base_n, batch_base_ms = batch_samples[-1]
    enqueue_base_n, enqueue_base_ms = enqueue_samples[-1]
    naive_base_n, naive_base_ms = naive_samples[-1]

    for target in BENCHMARK_PROJECTION_SCALES:
        batch_estimate_ms = batch_base_ms * (
            (target * math.log2(target)) / (batch_base_n * math.log2(batch_base_n))
        )
        enqueue_estimate_ms = enqueue_base_ms * (target / enqueue_base_n)
        naive_estimate_ms = naive_base_ms * (
            ((target ** 2) * math.log2(target))
            / ((naive_base_n ** 2) * math.log2(naive_base_n))
        )

        print(
            f"    10^{int(math.log10(target)):<7} |"
            f" {format_duration_ms(batch_estimate_ms):>10}"
            f" ({classify_duration(batch_estimate_ms):<9}) |"
            f" {format_duration_ms(enqueue_estimate_ms):>10}"
            f" ({classify_duration(enqueue_estimate_ms):<9}) |"
            f" {format_duration_ms(naive_estimate_ms):>14}"
            f" ({classify_duration(naive_estimate_ms):<9})"
        )

    print("\n  Leitura dos resultados:")
    print("  [1] Para lote único, a ordenação em batch continua simples e adequada.")
    print("  [2] O problema aparece quando a clínica tenta reordenar a fila inteira")
    print("      a cada nova chegada ao longo do turno.")
    print("  [3] Nesse ponto, a `TriageBucketQueue` ou uma fila persistida em banco")
    print("      passam a ser escolhas melhores do que repetir sort completo.")
    print("  [4] A tabela por ordens de grandeza deixa visível quando cada estratégia")
    print("      deixa de ser uma escolha razoável como abordagem principal.")


def requirements_checklist() -> None:
    section(f"6/{FULL_MODE_SECTION_COUNT}  RASTREABILIDADE DE REQUISITOS DO ENUNCIADO")

    checks = [
        ("Regra 1 — CRÍTICA tem prioridade máxima",
         "test_orders_by_adjusted_urgency_then_fifo"),
        ("Regra 2 — ALTA tem prioridade sobre MÉDIA e BAIXA",
         "test_orders_by_adjusted_urgency_then_fifo"),
        ("Regra 3 — FIFO dentro do mesmo nível",
         "test_preserves_input_order_for_exact_ties, test_fifo_within_bucket"),
        ("Regra 4 — idoso (60+) com MÉDIA sobe para ALTA",
         "test_elderly_medium_becomes_alta + boundary 59"),
        ("Regra 5 — menor (<18) ganha +1 nível, cap em CRÍTICA",
         "test_minor_gains_one_level, test_minor_is_capped_at_critical, boundaries 17/18"),
        ("Parte A — função de ordenação implementada",
         "order_triage_queue em triage.py"),
        ("Parte A — ao menos dois testes unitários com bordas das regras 4 e 5",
         "AdjustedPriorityTests (10 testes, 4 bordas)"),
        ("Parte B — análise escrita em ANALISE.md",
         f"{ANALYSIS_PATH.name} ({ANALYSIS_PATH.stat().st_size} bytes)"),
        ("Parte B — escolha de estrutura de dados justificada",
         "seção Estrutura de Dados em ANALISE.md"),
        ("Parte B — arquitetura de arquivos e responsabilidades documentadas",
         "seção Arquitetura de Pastas e Responsabilidades em ANALISE.md"),
        ("Parte B — complexidade e escalabilidade para 1M pacientes",
         "seção Análise de Escalabilidade em ANALISE.md"),
        ("Parte B — interação entre regras 4 e 5 com exemplo (15 anos, MÉDIA)",
         "test_fifteen_year_old_medium_becomes_alta_via_rule_5_only"),
        ("Parte B — extensibilidade para uma 6ª regra",
         "seção Extensibilidade em ANALISE.md"),
        ("Extra — exemplos executáveis separados por regra, empate, parsing e SQL",
         f"seção 4/{FULL_MODE_SECTION_COUNT} do verify.py"),
        ("Extra — demonstração prática de escala e trade-offs",
         f"seção 5/{FULL_MODE_SECTION_COUNT} do verify.py"),
        ("Extra — política de nomenclatura, comentários e validação documentada",
         "seções Nomenclatura, Política de Comentários e Tratamento de Erros em ANALISE.md"),
        ("Parte C — schema SQL de pacientes, filas e atendimentos",
         "schema.sql (6 tabelas + VIEW)"),
        ("Parte C — consultas eficientes (VIEW com regras 4 e 5 em SQL)",
         "v_triage_queue_ordered"),
        ("Extra — algoritmo ótimo para operação contínua",
         "TriageBucketQueue (O(1) enqueue/dequeue)"),
        ("Extra — entradas bilíngues (urgência PT/EN, horário datetime/HH:MM/ISO)",
         "canonical_urgency + parse_arrival_time"),
        ("Extra — integração Python × SQL provando paridade",
         "SqlSchemaIntegrationTests.test_view_ordering_matches_python"),
        ("Extra — CI automatiza a validação principal da Kata 1",
         ".github/workflows/kata-1.yml -> bash scripts/kata.sh kata1 verify"),
    ]

    for description, evidence in checks:
        bullet("OK", f"{description}")
        print(f"         -> {evidence}")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validação e demonstração executável da Kata 1."
    )
    parser.add_argument(
        "--mode",
        choices=("full", "full-verbose", "demo", "benchmark"),
        default=DEFAULT_MODE,
        help="Seleciona validação completa resumida, validação completa detalhada, apenas exemplos, ou apenas benchmark.",
    )
    args = parser.parse_args()

    if args.mode == "demo":
        ok = live_demo(verbose=True)
        return 0 if ok else 1

    if args.mode == "full-verbose":
        print()
        print(SEP)
        print("  KATA 1 — FILA DE TRIAGEM — RELATÓRIO DE ENTREGA")
        print(SEP)

        info = run_tests_with_coverage()
        tests_ok, total_tests = report_tests(info)
        coverage_pct = report_coverage(info)
        schema_ok, _ = validate_schema()
        demo_ok = live_demo(verbose=True)
        scalability_demo()
        requirements_checklist()

        section("RESUMO")
        all_ok = tests_ok and coverage_pct >= 100.0 and schema_ok and demo_ok
        bullet("OK" if tests_ok else "FAIL",
               f"Testes: {total_tests} executados em {info['duration']:.2f}s")
        bullet("OK" if coverage_pct >= 100.0 else "FAIL",
               f"Cobertura: {coverage_pct:.2f}%")
        bullet("OK" if schema_ok else "FAIL", "Schema SQL carrega em SQLite")
        bullet("OK" if demo_ok else "FAIL", "Python e SQL concordam na fila")
        print()
        if all_ok:
            print("  ENTREGA VALIDADA — todos os requisitos do enunciado atendidos.")
        else:
            print("  ENTREGA COM PENDÊNCIAS — ver itens marcados [FAIL] acima.")
        print(SEP)
        print()

        return 0 if all_ok else 1

    if args.mode == "benchmark":
        scalability_demo()
        return 0

    print()
    print(SEP)
    print("  KATA 1 — FILA DE TRIAGEM — RELATÓRIO DE ENTREGA")
    print(SEP)

    info = run_tests_with_coverage()
    tests_ok, total_tests = report_tests(info)
    coverage_pct = report_coverage(info)
    schema_ok, _ = validate_schema()
    demo_ok = live_demo(verbose=False)
    scalability_demo()
    requirements_checklist()

    section("RESUMO")
    all_ok = tests_ok and coverage_pct >= 100.0 and schema_ok and demo_ok
    bullet("OK" if tests_ok else "FAIL",
           f"Testes: {total_tests} executados em {info['duration']:.2f}s")
    bullet("OK" if coverage_pct >= 100.0 else "FAIL",
           f"Cobertura: {coverage_pct:.2f}%")
    bullet("OK" if schema_ok else "FAIL", "Schema SQL carrega em SQLite")
    bullet("OK" if demo_ok else "FAIL", "Python e SQL concordam na fila")
    print()
    if all_ok:
        print("  ENTREGA VALIDADA — todos os requisitos do enunciado atendidos.")
    else:
        print("  ENTREGA COM PENDÊNCIAS — ver itens marcados [FAIL] acima.")
    print(SEP)
    print()

    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())
