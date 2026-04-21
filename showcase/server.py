from __future__ import annotations

import argparse
import json
import math
import sys
import threading
import uuid
from datetime import datetime, timedelta
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


class CancelledJobError(RuntimeError):
    pass


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


JOBS = SimulationJobs()


class ShowcaseHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args: object, **kwargs: object) -> None:
        super().__init__(*args, directory=str(SHOWCASE_DIR), **kwargs)

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path == "/api/health":
            self._write_json(HTTPStatus.OK, {"ok": True})
            return

        if parsed.path.startswith("/api/triage-simulations/"):
            job_id = parsed.path.removeprefix("/api/triage-simulations/").strip("/")
            job = JOBS.get(job_id)
            if job is None:
                self._write_json(HTTPStatus.NOT_FOUND, {"error": "job not found"})
                return
            self._write_json(HTTPStatus.OK, job)
            return

        if parsed.path == "/":
            self.path = "/index.html"
        super().do_GET()

    def do_POST(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path == "/api/triage-simulations":
            payload = self._read_json()
            count = int(payload.get("count", 0))
            if count <= 0:
                self._write_json(HTTPStatus.BAD_REQUEST, {"error": "count must be positive"})
                return
            job_id = JOBS.create(count)
            self._write_json(HTTPStatus.ACCEPTED, {"job_id": job_id})
            return

        if parsed.path.endswith("/cancel") and parsed.path.startswith("/api/triage-simulations/"):
            job_id = parsed.path.removeprefix("/api/triage-simulations/").removesuffix("/cancel").strip("/")
            job = JOBS.cancel(job_id)
            if job is None:
                self._write_json(HTTPStatus.NOT_FOUND, {"error": "job not found"})
                return
            self._write_json(HTTPStatus.OK, {"job_id": job_id, "status": "cancelled"})
            return

        self._write_json(HTTPStatus.NOT_FOUND, {"error": "unsupported endpoint"})

    def _read_json(self) -> dict[str, object]:
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length) if length else b"{}"
        if not raw:
            return {}
        return json.loads(raw.decode("utf-8"))

    def _write_json(self, status: HTTPStatus, payload: dict[str, object]) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status.value)
        self.send_header("Content-Type", "application/json; charset=utf-8")
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
