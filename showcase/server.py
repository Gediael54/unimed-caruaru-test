from __future__ import annotations

import argparse
import json
import math
import os
import re
import signal
import subprocess
import sys
import threading
import uuid
from datetime import datetime, timedelta, timezone
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from time import perf_counter
from urllib.parse import urlparse


ROOT_DIR = Path(__file__).resolve().parents[1]
SHOWCASE_DIR = Path(__file__).resolve().parent
KATA1_DIR = ROOT_DIR / "kata-1"
if str(KATA1_DIR) not in sys.path:
    sys.path.insert(0, str(KATA1_DIR))

from triage import Patient, TriageBucketQueue, order_triage_queue  # noqa: E402


HOST = "127.0.0.1"
PORT = 8787
SERVER_NAIVE_BUDGET_MS = 3_000
PROGRESS_BATCH_SIZE = 25
VOLUME_API_LIMIT = 20_000
MAX_JSON_BODY_BYTES = 4_096
MAX_COMMAND_OUTPUT_CHARS = 20_000
ANSI_ESCAPE_RE = re.compile(r"\x1b(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])")
COMMAND_OUTPUT_TRUNCATION_PREFIX = "[...saida truncada para manter a UI legivel...]\n"
ACTIVE_COMMAND_STATUSES = {"queued", "running"}
SHOWCASE_ASSET_VERSION_TOKEN = "__SHOWCASE_ASSET_VERSION__"
SHOWCASE_ASSET_PATHS = (
    "index.html",
    "styles.css",
    "app.js",
    "js/catalog.js",
    "js/core.js",
    "js/render.js",
    "js/explorer.js",
    "js/events.js",
)


DOC_SPECS = [
    {"id": "repo-readme", "scope": "repo", "title": "README raiz", "path": "README.md"},
    {"id": "kata1-analysis", "scope": "kata-1", "title": "Kata 1 · ANALISE.md", "path": "kata-1/ANALISE.md"},
    {"id": "kata1-readme", "scope": "kata-1", "title": "Kata 1 · README.md", "path": "kata-1/README.md"},
    {"id": "kata2-readme", "scope": "kata-2", "title": "Kata 2 · README.md", "path": "kata-2/README.md"},
    {"id": "kata2-requisitos", "scope": "kata-2", "title": "Kata 2 · REQUISITOS.md", "path": "kata-2/REQUISITOS.md"},
    {"id": "kata2-engenharia", "scope": "kata-2", "title": "Kata 2 · ENGENHARIA.md", "path": "kata-2/ENGENHARIA.md"},
    {"id": "kata2-testes", "scope": "kata-2", "title": "Kata 2 · TESTES.md", "path": "kata-2/TESTES.md"},
    {"id": "kata3-plano", "scope": "kata-3", "title": "Kata 3 · PLANO.md", "path": "kata-3/PLANO.md"},
    {"id": "kata4-analysis", "scope": "kata-4", "title": "Kata 4 · ANALISE.md", "path": "kata-4/ANALISE.md"},
    {"id": "showcase-readme", "scope": "showcase", "title": "Showcase · README.md", "path": "showcase/README.md"},
]
DOCS_BY_ID = {spec["id"]: spec for spec in DOC_SPECS}


WINDOWS_HOST = os.name == "nt"
GIT_BASH_HOST = WINDOWS_HOST and bool(
    os.environ.get("MSYSTEM")
    or os.environ.get("MINGW_PREFIX")
    or os.environ.get("GIT_BASH")
)
BASH_RUNNER_HOST = not WINDOWS_HOST or GIT_BASH_HOST


def runner_command(*parts: str) -> str:
    joined = " ".join(parts)
    if not BASH_RUNNER_HOST:
        return f"scripts\\kata.cmd {joined}".strip()
    return f"bash scripts/kata.sh {joined}".strip()


def runner_argv(*parts: str) -> list[str]:
    if not BASH_RUNNER_HOST:
        return ["cmd", "/c", "scripts\\kata.cmd", *parts]
    return ["bash", "scripts/kata.sh", *parts]


def command_process_kwargs() -> dict[str, object]:
    if WINDOWS_HOST:
        creation_flags = getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0)
        return {"creationflags": creation_flags} if creation_flags else {}
    return {"start_new_session": True}


def terminate_command_process(process: subprocess.Popen[str], *, force: bool) -> None:
    pid = getattr(process, "pid", None)
    if WINDOWS_HOST and pid:
        command = ["taskkill", "/PID", str(pid), "/T"]
        if force:
            command.append("/F")
        try:
            subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
            return
        except OSError:
            pass

    if not WINDOWS_HOST and pid:
        try:
            os.killpg(pid, signal.SIGKILL if force else signal.SIGTERM)
            return
        except OSError:
            pass

    fallback = getattr(process, "kill" if force else "terminate", None)
    if fallback is not None:
        fallback()


def python_command(*parts: str) -> str:
    interpreter = "python" if WINDOWS_HOST else "python3"
    return " ".join([interpreter, *parts])


COMMAND_SPECS = [
    {
        "id": "repo-help",
        "scope": "repo",
        "title": "Runner · Ajuda completa",
        "description": "Mostra todos os comandos do runner e destaca o que atende ao enunciado.",
        "runner_command": runner_command("help"),
        "manual_command": runner_command("help"),
        "runnable": True,
        "recommended": True,
        "artifacts": [],
        "timeout_s": 60,
        "argv": runner_argv("help"),
    },
    {
        "id": "kata1-demo",
        "scope": "kata-1",
        "title": "Kata 1 · Demo executável",
        "description": "Executa a demonstração principal do algoritmo de triagem.",
        "runner_command": runner_command("kata1", "demo"),
        "manual_command": python_command("kata-1/verify.py", "--mode", "demo"),
        "runnable": True,
        "recommended": True,
        "artifacts": [],
        "timeout_s": 90,
        "argv": runner_argv("kata1", "demo"),
    },
    {
        "id": "kata1-tests",
        "scope": "kata-1",
        "title": "Kata 1 · Testes",
        "description": "Roda a suíte unitária da fila de triagem.",
        "runner_command": runner_command("kata1", "tests"),
        "manual_command": python_command("-m", "unittest", "discover", "-s", "kata-1", "-p", "test_*.py"),
        "runnable": True,
        "recommended": False,
        "artifacts": [],
        "timeout_s": 120,
        "argv": runner_argv("kata1", "tests"),
    },
    {
        "id": "kata1-verify",
        "scope": "kata-1",
        "title": "Kata 1 · Validação completa",
        "description": "Roda a validação resumida da kata com os extras de revisão.",
        "runner_command": runner_command("kata1", "verify"),
        "manual_command": python_command("kata-1/verify.py"),
        "runnable": True,
        "recommended": False,
        "artifacts": [],
        "timeout_s": 180,
        "argv": runner_argv("kata1", "verify"),
    },
    {
        "id": "kata1-explore",
        "scope": "kata-1",
        "title": "Kata 1 · Explorer em bash",
        "description": "Modo interativo no terminal para explorar casos e volumes manualmente.",
        "runner_command": runner_command("kata1", "explore"),
        "manual_command": python_command("kata-1/explore.py"),
        "runnable": False,
        "recommended": False,
        "artifacts": [],
    },
    {
        "id": "kata2-dev",
        "scope": "kata-2",
        "title": "Kata 2 · Backend + frontend",
        "description": "Fluxo integrado para subir o produto da kata em modo desenvolvimento.",
        "runner_command": runner_command("kata2", "dev"),
        "manual_command": (
            "Terminal 1:\n"
            "dotnet run --project kata-2/backend/TaskBoard.Api.csproj --urls http://localhost:5000\n\n"
            "Terminal 2:\n"
            "npm --prefix kata-2/frontend run dev"
        ),
        "runnable": True,
        "recommended": True,
        "artifacts": ["kata-2/artifacts/logs/backend.log"],
        "access_links": [
            {"label": "Abrir frontend", "url": "http://localhost:5173"},
            {"label": "Abrir health", "url": "http://localhost:5000/health"},
            {"label": "Abrir OpenAPI", "url": "http://localhost:5000/openapi/v1.json"},
        ],
        "timeout_s": 1800,
        "argv": runner_argv("kata2", "dev"),
    },
    {
        "id": "kata2-all",
        "scope": "kata-2",
        "title": "Kata 2 · Suíte offline",
        "description": "Executa restore, build, testes e validações do frontend/backend.",
        "runner_command": runner_command("kata2", "all"),
        "manual_command": (
            "dotnet restore kata-2/backend.tests/TaskBoard.Api.Tests.csproj\n"
            "dotnet build kata-2/backend/TaskBoard.Api.csproj --no-restore\n"
            "dotnet test kata-2/backend.tests/TaskBoard.Api.Tests.csproj --filter Scope=Backend --no-restore\n"
            "dotnet test kata-2/backend.tests/TaskBoard.Api.Tests.csproj --filter Scope=Api --no-restore\n"
            "npm --prefix kata-2/frontend ci\n"
            "npm --prefix kata-2/frontend run lint\n"
            "npm --prefix kata-2/frontend run test\n"
            "npm --prefix kata-2/frontend run build"
        ),
        "runnable": True,
        "recommended": True,
        "artifacts": [
            "kata-2/artifacts/frontend/dist",
            "kata-2/artifacts/frontend/coverage",
        ],
        "timeout_s": 900,
        "argv": runner_argv("kata2", "all"),
    },
    {
        "id": "kata2-backend-tests",
        "scope": "kata-2",
        "title": "Kata 2 · Testes do backend",
        "description": "Roda os testes de regra do backend .NET.",
        "runner_command": runner_command("kata2", "backend-tests"),
        "manual_command": "dotnet test kata-2/backend.tests/TaskBoard.Api.Tests.csproj --filter Scope=Backend --no-restore",
        "runnable": True,
        "recommended": False,
        "artifacts": [],
        "timeout_s": 300,
        "argv": runner_argv("kata2", "backend-tests"),
    },
    {
        "id": "kata2-api-tests",
        "scope": "kata-2",
        "title": "Kata 2 · Testes de contrato HTTP",
        "description": "Valida o contrato exposto pela API .NET.",
        "runner_command": runner_command("kata2", "api-tests"),
        "manual_command": "dotnet test kata-2/backend.tests/TaskBoard.Api.Tests.csproj --filter Scope=Api --no-restore",
        "runnable": True,
        "recommended": False,
        "artifacts": [],
        "timeout_s": 300,
        "argv": runner_argv("kata2", "api-tests"),
    },
    {
        "id": "kata2-frontend-lint",
        "scope": "kata-2",
        "title": "Kata 2 · Lint do frontend",
        "description": "Executa ESLint na aplicação React + TypeScript.",
        "runner_command": runner_command("kata2", "frontend-lint"),
        "manual_command": "npm --prefix kata-2/frontend run lint",
        "runnable": True,
        "recommended": False,
        "artifacts": [],
        "timeout_s": 180,
        "argv": runner_argv("kata2", "frontend-lint"),
    },
    {
        "id": "kata2-frontend-tests",
        "scope": "kata-2",
        "title": "Kata 2 · Testes do frontend",
        "description": "Roda Vitest na aplicação da Kata 2.",
        "runner_command": runner_command("kata2", "frontend-tests"),
        "manual_command": "npm --prefix kata-2/frontend run test",
        "runnable": True,
        "recommended": False,
        "artifacts": ["kata-2/artifacts/frontend/coverage"],
        "timeout_s": 300,
        "argv": runner_argv("kata2", "frontend-tests"),
    },
    {
        "id": "kata2-frontend-build",
        "scope": "kata-2",
        "title": "Kata 2 · Build do frontend",
        "description": "Gera o build da UI em Vite e TypeScript.",
        "runner_command": runner_command("kata2", "frontend-build"),
        "manual_command": "npm --prefix kata-2/frontend run build",
        "runnable": True,
        "recommended": False,
        "artifacts": ["kata-2/artifacts/frontend/dist"],
        "timeout_s": 300,
        "argv": runner_argv("kata2", "frontend-build"),
    },
    {
        "id": "kata4-pipeline",
        "scope": "kata-4",
        "title": "Kata 4 · Pipeline",
        "description": "Executa o pipeline e gera o consolidado com indicadores.",
        "runner_command": runner_command("kata4", "pipeline"),
        "manual_command": python_command("kata-4/pipeline.py"),
        "runnable": True,
        "recommended": True,
        "artifacts": [
            "kata-4/output/consolidated.csv",
            "kata-4/output/indicators.json",
        ],
        "timeout_s": 180,
        "argv": runner_argv("kata4", "pipeline"),
    },
    {
        "id": "kata4-tests",
        "scope": "kata-4",
        "title": "Kata 4 · Testes",
        "description": "Executa a suíte unitária do pipeline.",
        "runner_command": runner_command("kata4", "tests"),
        "manual_command": python_command("-m", "unittest", "discover", "-s", "kata-4", "-p", "test_*.py"),
        "runnable": True,
        "recommended": False,
        "artifacts": [],
        "timeout_s": 180,
        "argv": runner_argv("kata4", "tests"),
    },
    {
        "id": "showcase-tests",
        "scope": "showcase",
        "title": "Showcase · Testes",
        "description": "Valida a API local e a lógica da camada visual do repositório.",
        "runner_command": runner_command("showcase", "tests"),
        "manual_command": python_command("-m", "unittest", "discover", "-s", "showcase", "-p", "test_*.py"),
        "runnable": True,
        "recommended": False,
        "artifacts": [],
        "timeout_s": 180,
        "argv": runner_argv("showcase", "tests"),
    },
    {
        "id": "all-validate",
        "scope": "repo",
        "title": "Repositório · Validação completa",
        "description": "Executa o fluxo offline principal das Katas 1, 2 e 4.",
        "runner_command": runner_command("all", "validate"),
        "manual_command": runner_command("all", "validate"),
        "runnable": True,
        "recommended": True,
        "artifacts": [
            "kata-2/artifacts/frontend/dist",
            "kata-4/output",
        ],
        "timeout_s": 1_200,
        "argv": runner_argv("all", "validate"),
    },
]
COMMANDS_BY_ID = {spec["id"]: spec for spec in COMMAND_SPECS}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def trim_output(text: str) -> str:
    if len(text) <= MAX_COMMAND_OUTPUT_CHARS:
        return text
    kept = text[-MAX_COMMAND_OUTPUT_CHARS:]
    return COMMAND_OUTPUT_TRUNCATION_PREFIX + kept


def summarize_command_tail(
    output_tail: str,
    *,
    total_chars: int,
    total_lines: int,
    has_ansi: bool,
) -> dict[str, object]:
    output_truncated = total_chars > len(output_tail)
    return {
        "output": COMMAND_OUTPUT_TRUNCATION_PREFIX + output_tail if output_truncated else output_tail,
        "output_format": "ansi" if has_ansi else "plain",
        "output_truncated": output_truncated,
        "output_char_count": total_chars,
        "output_line_count": total_lines,
    }


def summarize_command_output(text: str) -> dict[str, object]:
    raw_output = text or ""
    non_empty_lines = [line for line in raw_output.splitlines() if line.strip()]
    return summarize_command_tail(
        raw_output[-MAX_COMMAND_OUTPUT_CHARS:] if len(raw_output) > MAX_COMMAND_OUTPUT_CHARS else raw_output,
        total_chars=len(raw_output),
        total_lines=len(non_empty_lines),
        has_ansi=bool(ANSI_ESCAPE_RE.search(raw_output)),
    )


class CommandOutputBuffer:
    def __init__(self) -> None:
        self.tail = ""
        self.total_chars = 0
        self.total_lines = 0
        self.has_ansi = False

    def append(self, chunk: str) -> None:
        if not chunk:
            return
        self.total_chars += len(chunk)
        self.total_lines += len([line for line in chunk.splitlines() if line.strip()])
        self.has_ansi = self.has_ansi or bool(ANSI_ESCAPE_RE.search(chunk))
        self.tail = (self.tail + chunk)[-MAX_COMMAND_OUTPUT_CHARS:]

    def summary(self) -> dict[str, object]:
        return summarize_command_tail(
            self.tail,
            total_chars=self.total_chars,
            total_lines=self.total_lines,
            has_ansi=self.has_ansi,
        )


def build_command_run(run_id: str, spec: dict[str, object]) -> dict[str, object]:
    created_at = now_iso()
    return {
        "run_id": run_id,
        "command_id": spec["id"],
        "scope": spec["scope"],
        "title": spec["title"],
        "runner_command": spec["runner_command"],
        "manual_command": spec["manual_command"],
        "access_links": spec.get("access_links", []),
        "status": "queued",
        "stage_label": "Na fila do showcase",
        "created_at": created_at,
        "updated_at": created_at,
        "started_at": None,
        "finished_at": None,
        "completed_at": None,
        "duration_ms": None,
        "exit_code": None,
        "timed_out": False,
        "cancelled": False,
        "is_running": False,
        "can_cancel": True,
        "output_complete": False,
        "output": "",
        "output_format": "plain",
        "output_truncated": False,
        "output_char_count": 0,
        "output_line_count": 0,
        "note": "job criado",
        "pid": None,
    }


def public_command_spec(spec: dict[str, object]) -> dict[str, object]:
    return {
        "id": spec["id"],
        "scope": spec["scope"],
        "title": spec["title"],
        "description": spec["description"],
        "runner_command": spec["runner_command"],
        "manual_command": spec["manual_command"],
        "runnable": spec["runnable"],
        "recommended": spec.get("recommended", False),
        "artifacts": spec.get("artifacts", []),
        "access_links": spec.get("access_links", []),
    }


def public_doc_spec(spec: dict[str, object]) -> dict[str, object]:
    return {
        "id": spec["id"],
        "scope": spec["scope"],
        "title": spec["title"],
        "path": spec["path"],
    }


def read_doc_payload(doc_id: str) -> dict[str, object] | None:
    spec = DOCS_BY_ID.get(doc_id)
    if spec is None:
        return None

    file_path = ROOT_DIR / str(spec["path"])
    if not file_path.exists():
        return None

    return {
        "id": spec["id"],
        "scope": spec["scope"],
        "title": spec["title"],
        "path": spec["path"],
        "content": file_path.read_text(encoding="utf-8"),
        "updated_at": datetime.fromtimestamp(file_path.stat().st_mtime, tz=timezone.utc)
        .isoformat(timespec="seconds")
        .replace("+00:00", "Z"),
    }


def build_showcase_asset_version() -> str:
    mtimes_ns = []
    for relative_path in SHOWCASE_ASSET_PATHS:
        file_path = SHOWCASE_DIR / relative_path
        if not file_path.exists():
            continue
        mtimes_ns.append(file_path.stat().st_mtime_ns)

    if not mtimes_ns:
        return "0"

    return str(max(mtimes_ns))


def read_index_html_with_version() -> str:
    index_path = SHOWCASE_DIR / "index.html"
    content = index_path.read_text(encoding="utf-8")
    return content.replace(SHOWCASE_ASSET_VERSION_TOKEN, build_showcase_asset_version())


def build_synthetic_patients(count: int) -> list[Patient]:
    urgencies = ("BAIXA", "MÉDIA", "ALTA", "CRÍTICA")
    ages = (10, 17, 18, 30, 59, 60, 75)
    base_time = datetime(2026, 4, 20, 7, 0)
    patients: list[Patient] = []
    for index in range(count):
        patients.append(
            Patient(
                id=f"synthetic-{index}",
                name=f"Paciente {index:05d}",
                age=ages[index % len(ages)],
                urgency=urgencies[index % len(urgencies)],
                arrival_time=base_time + timedelta(minutes=index),
            )
        )
    return patients


def complexity_units(count: int) -> float:
    if count <= 1:
        return 1.0
    return (count**2) * math.log2(count)


def estimate_naive_duration_ms(elapsed_ms: float, processed: int, total: int) -> float:
    safe_processed = max(processed, 2)
    return elapsed_ms * (complexity_units(total) / complexity_units(safe_processed))


def parse_simulation_count(payload: dict[str, object]) -> int:
    raw_count = payload.get("count")
    if isinstance(raw_count, bool):
        raise ValueError("count must be an integer")
    try:
        count = int(raw_count)  # type: ignore[arg-type]
    except (TypeError, ValueError) as exc:
        raise ValueError("count must be an integer") from exc

    if count <= 0:
        raise ValueError("count must be positive")
    if count > VOLUME_API_LIMIT:
        raise ValueError(f"count must be at most {VOLUME_API_LIMIT}")
    return count


class CancelledJobError(RuntimeError):
    pass


class CommandRunAlreadyActiveError(RuntimeError):
    def __init__(self, active_run: dict[str, object]) -> None:
        super().__init__("another command run is already active")
        self.active_run = active_run


class SimulationJobs:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._jobs: dict[str, dict[str, object]] = {}

    def create(self, count: int) -> str:
        job_id = str(uuid.uuid4())
        with self._lock:
            self._jobs[job_id] = {
                "job_id": job_id,
                "count": count,
                "status": "queued",
                "progress_pct": 0,
                "stage_label": "Aguardando worker",
                "processed": 0,
                "elapsed_ms": 0.0,
                "note": "job criado",
                "metrics": None,
                "budget_hit": False,
                "cancelled": False,
                "error": None,
                "source": "api-local",
            }

        threading.Thread(target=self._run, args=(job_id,), daemon=True).start()
        return job_id

    def get(self, job_id: str) -> dict[str, object] | None:
        with self._lock:
            job = self._jobs.get(job_id)
            return dict(job) if job is not None else None

    def cancel(self, job_id: str) -> dict[str, object] | None:
        with self._lock:
            job = self._jobs.get(job_id)
            if job is None:
                return None
            job["cancelled"] = True
            if job["status"] in {"queued", "running"}:
                job["status"] = "cancelled"
                job["note"] = "cancelado pelo cliente"
            return dict(job)

    def _update(self, job_id: str, **fields: object) -> None:
        with self._lock:
            job = self._jobs[job_id]
            job.update(fields)

    def _ensure_not_cancelled(self, job_id: str) -> None:
        with self._lock:
            job = self._jobs[job_id]
            if bool(job.get("cancelled")):
                raise CancelledJobError(job_id)

    def _run(self, job_id: str) -> None:
        try:
            count = int(self.get(job_id)["count"])
            patients = build_synthetic_patients(count)
            self._update(
                job_id,
                status="running",
                stage_label="Preparando lote sintético",
                progress_pct=5,
                processed=0,
                elapsed_ms=0.0,
                note="acima de 2.000 pacientes, a simulação roda em background na API local",
            )
            self._ensure_not_cancelled(job_id)

            batch_start = perf_counter()
            order_triage_queue(patients)
            batch_ms = (perf_counter() - batch_start) * 1000
            self._update(
                job_id,
                stage_label="Medição 1/4 · batch sort",
                progress_pct=25,
                processed=count,
                elapsed_ms=batch_ms,
                note="medição exata concluída",
            )
            self._ensure_not_cancelled(job_id)

            queue = TriageBucketQueue()
            enqueue_start = perf_counter()
            for patient in patients:
                queue.enqueue(patient)
            enqueue_ms = (perf_counter() - enqueue_start) * 1000
            self._update(
                job_id,
                stage_label="Medição 2/4 · bucket enqueue",
                progress_pct=45,
                processed=count,
                elapsed_ms=batch_ms + enqueue_ms,
                note="medição exata concluída",
            )
            self._ensure_not_cancelled(job_id)

            consume_start = perf_counter()
            while queue.dequeue_next() is not None:
                continue
            consume_ms = (perf_counter() - consume_start) * 1000
            self._update(
                job_id,
                stage_label="Medição 3/4 · bucket consume",
                progress_pct=60,
                processed=count,
                elapsed_ms=batch_ms + enqueue_ms + consume_ms,
                note="medição exata concluída",
            )
            self._ensure_not_cancelled(job_id)

            current_batch: list[Patient] = []
            naive_start = perf_counter()
            processed = 0
            budget_hit = False

            while processed < count:
                for _ in range(PROGRESS_BATCH_SIZE):
                    if processed >= count:
                        break
                    self._ensure_not_cancelled(job_id)
                    current_batch.append(patients[processed])
                    order_triage_queue(current_batch)
                    processed += 1

                naive_elapsed_ms = (perf_counter() - naive_start) * 1000
                self._update(
                    job_id,
                    stage_label="Medição 4/4 · cenário contínuo ingênuo",
                    progress_pct=60 + int(40 * min(processed / count, 1)),
                    processed=processed,
                    elapsed_ms=naive_elapsed_ms,
                    note="backend atualizando o progresso enquanto a UI continua responsiva",
                )
                if naive_elapsed_ms >= SERVER_NAIVE_BUDGET_MS:
                    budget_hit = True
                    break

            naive_elapsed_ms = (perf_counter() - naive_start) * 1000
            naive_ms = (
                estimate_naive_duration_ms(naive_elapsed_ms, processed, count)
                if budget_hit
                else naive_elapsed_ms
            )

            self._update(
                job_id,
                status="done",
                stage_label="Job concluído",
                progress_pct=100,
                processed=processed,
                elapsed_ms=batch_ms + enqueue_ms + consume_ms + naive_elapsed_ms,
                note=(
                    "orçamento do backend atingido; restante extrapolado"
                    if budget_hit
                    else "medição completa concluída no backend"
                ),
                budget_hit=budget_hit,
                metrics=[
                    {"label": "batch sort", "ms": batch_ms, "mode": "medido"},
                    {"label": "bucket enqueue", "ms": enqueue_ms, "mode": "medido"},
                    {"label": "bucket consume", "ms": consume_ms, "mode": "medido"},
                    {
                        "label": "contínuo ingênuo",
                        "ms": naive_ms,
                        "mode": "estimado" if budget_hit else "medido",
                    },
                ],
            )
        except CancelledJobError:
            self._update(
                job_id,
                status="cancelled",
                stage_label="Job cancelado",
                note="a UI pediu uma nova simulação e esta execução foi interrompida",
            )
        except Exception as exc:  # pragma: no cover
            self._update(
                job_id,
                status="error",
                stage_label="Falha no job",
                note="erro ao processar a simulação em background",
                error=str(exc),
            )


class CommandRuns:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._jobs: dict[str, dict[str, object]] = {}
        self._processes: dict[str, subprocess.Popen[str]] = {}

    def _snapshot(self, run_id: str) -> dict[str, object] | None:
        job = self._jobs.get(run_id)
        return dict(job) if job is not None else None

    def _active_run(self) -> dict[str, object] | None:
        for job in self._jobs.values():
            if job.get("status") in ACTIVE_COMMAND_STATUSES and not bool(job.get("cancelled")):
                return dict(job)
        return None

    def _update(self, run_id: str, **fields: object) -> dict[str, object]:
        job = self._jobs[run_id]
        fields["updated_at"] = now_iso()
        job.update(fields)
        return dict(job)

    def _update_output_snapshot(self, run_id: str, output: str, **fields: object) -> dict[str, object]:
        output_summary = summarize_command_output(output)
        output_summary.update(fields)
        return self._update(run_id, **output_summary)

    def create(self, command_id: str) -> str:
        spec = COMMANDS_BY_ID.get(command_id)
        if spec is None:
            raise KeyError(command_id)
        if not bool(spec.get("runnable")):
            raise ValueError(command_id)

        with self._lock:
            active_run = self._active_run()
            if active_run is not None:
                raise CommandRunAlreadyActiveError(active_run)

            run_id = str(uuid.uuid4())
            self._jobs[run_id] = build_command_run(run_id, spec)

        threading.Thread(target=self._run, args=(run_id, spec), daemon=True).start()
        return run_id

    def get(self, run_id: str) -> dict[str, object] | None:
        with self._lock:
            return self._snapshot(run_id)

    def cancel(self, run_id: str) -> dict[str, object] | None:
        with self._lock:
            job = self._jobs.get(run_id)
            if job is None:
                return None
            job["cancelled"] = True
            process = self._processes.get(run_id)
            if process is None:
                finished_at = now_iso()
                job.update(
                    status="cancelled",
                    stage_label="Execução cancelada",
                    note="cancelamento solicitado antes do processo iniciar",
                    is_running=False,
                    can_cancel=False,
                    output_complete=True,
                    finished_at=finished_at,
                    completed_at=finished_at,
                    duration_ms=job.get("duration_ms") or 0.0,
                    updated_at=finished_at,
                )
            else:
                job.update(
                    stage_label="Cancelamento solicitado",
                    note="cancelamento solicitado",
                    can_cancel=False,
                    updated_at=now_iso(),
                )
        if process is not None:
            terminate_command_process(process, force=False)
        return self.get(run_id)

    def _stream_process_output(self, run_id: str, process: subprocess.Popen[str], timeout_s: int) -> tuple[dict[str, object], bool]:
        stdout = getattr(process, "stdout", None)
        if stdout is None or not hasattr(process, "wait"):
            timed_out = False
            try:
                output, _ = process.communicate(timeout=timeout_s)
            except subprocess.TimeoutExpired:
                timed_out = True
                terminate_command_process(process, force=True)
                output, _ = process.communicate()
            return summarize_command_output(output), timed_out

        output_buffer = CommandOutputBuffer()
        output_lock = threading.Lock()
        reader_done = threading.Event()

        def reader() -> None:
            try:
                for chunk in iter(stdout.readline, ""):
                    if chunk == "":
                        break
                    with output_lock:
                        output_buffer.append(chunk)
                        output_summary = output_buffer.summary()
                    with self._lock:
                        if run_id in self._jobs:
                            self._update(
                                run_id,
                                stage_label="Processo em execução · saída parcial recebida",
                                note="a API local está publicando o retorno parcial do terminal",
                                is_running=True,
                                can_cancel=True,
                                output_complete=False,
                                **output_summary,
                            )
            finally:
                reader_done.set()

        threading.Thread(target=reader, daemon=True).start()

        timed_out = False
        try:
            process.wait(timeout=timeout_s)
        except subprocess.TimeoutExpired:
            timed_out = True
            terminate_command_process(process, force=True)

        reader_done.wait(timeout=1.5)
        remainder = ""
        try:
            remainder, _ = process.communicate(timeout=1)
        except Exception:
            remainder = ""

        with output_lock:
            if remainder:
                output_buffer.append(remainder)
            output_summary = output_buffer.summary()

        return output_summary, timed_out

    def _run(self, run_id: str, spec: dict[str, object]) -> None:
        start = perf_counter()
        try:
            with self._lock:
                job = self._jobs[run_id]
                if bool(job.get("cancelled")):
                    finished_at = now_iso()
                    job.update(
                        status="cancelled",
                        stage_label="Execução cancelada",
                        note="cancelamento solicitado antes do processo iniciar",
                        is_running=False,
                        can_cancel=False,
                        output_complete=True,
                        finished_at=finished_at,
                        completed_at=finished_at,
                        duration_ms=0.0,
                        updated_at=finished_at,
                    )
                    return

                started_at = now_iso()
                job.update(
                    status="running",
                    stage_label="Preparando processo local",
                    started_at=started_at,
                    note="executando comando permitido do catálogo",
                    is_running=True,
                    can_cancel=True,
                    output_complete=False,
                    updated_at=started_at,
                )

            process = subprocess.Popen(
                spec["argv"],
                cwd=str(ROOT_DIR),
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                **command_process_kwargs(),
            )
            with self._lock:
                self._processes[run_id] = process
                self._update(
                    run_id,
                    pid=process.pid,
                    stage_label="Processo iniciado · aguardando saída",
                )

            output_summary, timed_out = self._stream_process_output(
                run_id,
                process,
                int(spec["timeout_s"]),
            )

            duration_ms = (perf_counter() - start) * 1000
            finished_at = now_iso()
            with self._lock:
                job = self._jobs[run_id]
                final_fields: dict[str, object] = {
                    "finished_at": finished_at,
                    "completed_at": finished_at,
                    "duration_ms": duration_ms,
                    "exit_code": process.returncode,
                    "timed_out": timed_out,
                    "is_running": False,
                    "can_cancel": False,
                    "output_complete": True,
                    **output_summary,
                }
                if timed_out:
                    final_fields.update(
                        status="error",
                        stage_label="Tempo limite excedido",
                        note="tempo limite excedido durante a execução",
                    )
                elif bool(job.get("cancelled")):
                    final_fields.update(
                        status="cancelled",
                        stage_label="Execução cancelada",
                        note="execução cancelada pelo usuário",
                    )
                elif process.returncode == 0:
                    final_fields.update(
                        status="done",
                        stage_label="Execução concluída",
                        note="execução concluída com sucesso",
                    )
                else:
                    final_fields.update(
                        status="error",
                        stage_label="Execução com falha",
                        note="o comando terminou com código de erro",
                    )
                self._processes.pop(run_id, None)
                self._update(run_id, **final_fields)
        except Exception as exc:  # pragma: no cover
            with self._lock:
                finished_at = now_iso()
                output_summary = summarize_command_output(str(exc))
                self._update(
                    run_id,
                    status="error",
                    stage_label="Falha ao iniciar processo",
                    finished_at=finished_at,
                    completed_at=finished_at,
                    duration_ms=(perf_counter() - start) * 1000,
                    note="falha ao iniciar a execução do comando",
                    is_running=False,
                    can_cancel=False,
                    output_complete=True,
                    **output_summary,
                )
        finally:
            with self._lock:
                self._processes.pop(run_id, None)


SIMULATION_JOBS = SimulationJobs()
COMMAND_RUNS = CommandRuns()


class ShowcaseHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args: object, **kwargs: object) -> None:
        super().__init__(*args, directory=str(SHOWCASE_DIR), **kwargs)

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path in {"/", "/index.html"}:
            self._write_html(HTTPStatus.OK, read_index_html_with_version())
            return

        if parsed.path == "/api/health":
            self._write_json(
                HTTPStatus.OK,
                {
                    "ok": True,
                    "showcase": "ready",
                    "commands": len(COMMAND_SPECS),
                    "runner_family": "bash" if BASH_RUNNER_HOST else "cmd",
                    "runner_help_command": runner_command("help"),
                    "showcase_start_command": runner_command("showcase", "serve"),
                },
            )
            return

        if parsed.path == "/api/commands":
            self._write_json(
                HTTPStatus.OK,
                {"commands": [public_command_spec(spec) for spec in COMMAND_SPECS]},
            )
            return

        if parsed.path == "/api/docs":
            self._write_json(
                HTTPStatus.OK,
                {"docs": [public_doc_spec(spec) for spec in DOC_SPECS]},
            )
            return

        if parsed.path.startswith("/api/docs/"):
            doc_id = parsed.path.removeprefix("/api/docs/").strip("/")
            payload = read_doc_payload(doc_id)
            if payload is None:
                self._write_json(HTTPStatus.NOT_FOUND, {"error": "doc not found"})
                return
            self._write_json(HTTPStatus.OK, payload)
            return

        if parsed.path.startswith("/api/command-runs/"):
            run_id = parsed.path.removeprefix("/api/command-runs/").strip("/")
            run = COMMAND_RUNS.get(run_id)
            if run is None:
                self._write_json(HTTPStatus.NOT_FOUND, {"error": "run not found"})
                return
            self._write_json(HTTPStatus.OK, run)
            return

        if parsed.path.startswith("/api/triage-simulations/"):
            job_id = parsed.path.removeprefix("/api/triage-simulations/").strip("/")
            job = SIMULATION_JOBS.get(job_id)
            if job is None:
                self._write_json(HTTPStatus.NOT_FOUND, {"error": "job not found"})
                return
            self._write_json(HTTPStatus.OK, job)
            return

        super().do_GET()

    def do_POST(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path == "/api/triage-simulations":
            try:
                payload = self._read_json()
                count = parse_simulation_count(payload)
            except ValueError as exc:
                self._write_json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
                return
            job_id = SIMULATION_JOBS.create(count)
            self._write_json(HTTPStatus.ACCEPTED, {"job_id": job_id})
            return

        if parsed.path.endswith("/cancel") and parsed.path.startswith("/api/triage-simulations/"):
            job_id = parsed.path.removeprefix("/api/triage-simulations/").removesuffix("/cancel").strip("/")
            job = SIMULATION_JOBS.cancel(job_id)
            if job is None:
                self._write_json(HTTPStatus.NOT_FOUND, {"error": "job not found"})
                return
            self._write_json(HTTPStatus.OK, {"job_id": job_id, "status": "cancelled"})
            return

        if parsed.path == "/api/command-runs":
            try:
                payload = self._read_json()
            except ValueError as exc:
                self._write_json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
                return
            command_id = str(payload.get("command_id", "")).strip()
            if not command_id:
                self._write_json(HTTPStatus.BAD_REQUEST, {"error": "command_id is required"})
                return
            try:
                run_id = COMMAND_RUNS.create(command_id)
            except CommandRunAlreadyActiveError as exc:
                self._write_json(
                    HTTPStatus.CONFLICT,
                    {"error": "another command run is already active", "run": exc.active_run},
                )
                return
            except KeyError:
                self._write_json(HTTPStatus.NOT_FOUND, {"error": "command not found"})
                return
            except ValueError:
                self._write_json(HTTPStatus.BAD_REQUEST, {"error": "command is not runnable here"})
                return
            self._write_json(
                HTTPStatus.ACCEPTED,
                {
                    "run_id": run_id,
                    "run": COMMAND_RUNS.get(run_id),
                },
            )
            return

        if parsed.path.endswith("/cancel") and parsed.path.startswith("/api/command-runs/"):
            run_id = parsed.path.removeprefix("/api/command-runs/").removesuffix("/cancel").strip("/")
            run = COMMAND_RUNS.cancel(run_id)
            if run is None:
                self._write_json(HTTPStatus.NOT_FOUND, {"error": "run not found"})
                return
            self._write_json(HTTPStatus.OK, {"run_id": run_id, "status": "cancelled"})
            return

        self._write_json(HTTPStatus.NOT_FOUND, {"error": "unsupported endpoint"})

    def _read_json(self) -> dict[str, object]:
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError as exc:
            raise ValueError("invalid Content-Length") from exc
        if length > MAX_JSON_BODY_BYTES:
            raise ValueError("request body is too large")
        raw = self.rfile.read(length) if length else b"{}"
        if not raw:
            return {}
        try:
            payload = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise ValueError("invalid JSON body") from exc
        if not isinstance(payload, dict):
            raise ValueError("JSON body must be an object")
        return payload

    def _write_json(self, status: HTTPStatus, payload: dict[str, object]) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status.value)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _write_html(self, status: HTTPStatus, html: str) -> None:
        body = html.encode("utf-8")
        self.send_response(status.value)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args: object) -> None:
        sys.stdout.write(f"[showcase] {self.client_address[0]} - {format % args}\n")


def main() -> int:
    parser = argparse.ArgumentParser(description="Serve the showcase UI plus local API.")
    parser.add_argument("--host", default=HOST)
    parser.add_argument("--port", type=int, default=PORT)
    args = parser.parse_args()

    server = ThreadingHTTPServer((args.host, args.port), ShowcaseHandler)
    print(f"Showcase disponível em http://{args.host}:{args.port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nEncerrando showcase.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
