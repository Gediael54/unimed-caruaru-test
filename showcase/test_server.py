from __future__ import annotations

import argparse
import contextlib
import io
import runpy
import types
import unittest
from pathlib import Path
from unittest.mock import patch

import server


class ShowcaseHelpersTests(unittest.TestCase):
    def test_build_synthetic_patients_is_deterministic(self) -> None:
        patients = server.build_synthetic_patients(3)

        self.assertEqual([patient.id for patient in patients], ["synthetic-0", "synthetic-1", "synthetic-2"])
        self.assertEqual([patient.name for patient in patients], ["Paciente 00000", "Paciente 00001", "Paciente 00002"])
        self.assertEqual([patient.age for patient in patients], [10, 17, 18])
        self.assertEqual([patient.urgency for patient in patients], ["BAIXA", "MÉDIA", "ALTA"])

    def test_complexity_units_handles_small_counts(self) -> None:
        self.assertEqual(server.complexity_units(0), 1.0)
        self.assertEqual(server.complexity_units(1), 1.0)
        self.assertGreater(server.complexity_units(10), 1.0)

    def test_estimate_naive_duration_uses_processed_floor(self) -> None:
        estimated = server.estimate_naive_duration_ms(150.0, 1, 100)
        self.assertGreater(estimated, 150.0)


class SimulationJobsTests(unittest.TestCase):
    def setUp(self) -> None:
        self.jobs = server.SimulationJobs()

    def test_create_registers_queued_job_and_starts_thread(self) -> None:
        started: dict[str, object] = {}

        class FakeThread:
            def __init__(self, *thread_args: object, target=None, args=(), daemon=None, **thread_kwargs: object) -> None:
                started["target"] = target
                started["args"] = args
                started["daemon"] = daemon

            def start(self) -> None:
                started["started"] = True

        with patch.object(server.uuid, "uuid4", return_value="job-fixed"), patch.object(server.threading, "Thread", FakeThread):
            job_id = self.jobs.create(2500)

        job = self.jobs.get(job_id)
        self.assertEqual(job_id, "job-fixed")
        self.assertEqual(job["status"], "queued")
        self.assertEqual(job["count"], 2500)
        self.assertEqual(job["source"], "api-local")
        self.assertTrue(started["started"])
        self.assertEqual(started["args"], ("job-fixed",))
        self.assertTrue(started["daemon"])

    def test_get_returns_none_for_unknown_job(self) -> None:
        self.assertIsNone(self.jobs.get("missing"))

    def test_cancel_returns_none_for_unknown_job(self) -> None:
        self.assertIsNone(self.jobs.cancel("missing"))

    def test_cancel_marks_running_job(self) -> None:
        self.jobs._jobs["job-1"] = {
            "job_id": "job-1",
            "count": 3000,
            "status": "running",
            "note": "old",
            "cancelled": False,
        }

        job = self.jobs.cancel("job-1")

        self.assertEqual(job["status"], "cancelled")
        self.assertEqual(job["note"], "cancelado pelo cliente")
        self.assertTrue(job["cancelled"])

    def test_ensure_not_cancelled_raises_for_cancelled_job(self) -> None:
        self.jobs._jobs["job-1"] = {"cancelled": True}
        with self.assertRaises(server.CancelledJobError):
            self.jobs._ensure_not_cancelled("job-1")

    def test_run_finishes_job_without_budget_hit(self) -> None:
        patients = server.build_synthetic_patients(2)

        class FakeQueue:
            def __init__(self) -> None:
                self.items: list[object] = []

            def enqueue(self, patient: object) -> None:
                self.items.append(patient)

            def dequeue_next(self) -> object | None:
                if self.items:
                    return self.items.pop(0)
                return None

        self.jobs._jobs["job-1"] = {
            "job_id": "job-1",
            "count": 2,
            "status": "queued",
            "progress_pct": 0,
            "stage_label": "queued",
            "processed": 0,
            "elapsed_ms": 0.0,
            "note": "",
            "metrics": None,
            "budget_hit": False,
            "cancelled": False,
            "error": None,
            "source": "api-local",
        }

        with patch.object(server, "build_synthetic_patients", return_value=patients), patch.object(server, "order_triage_queue", side_effect=lambda items: list(items)), patch.object(server, "TriageBucketQueue", FakeQueue), patch.object(
            server,
            "perf_counter",
            side_effect=[0.0, 0.001, 0.001, 0.002, 0.002, 0.003, 0.003, 0.004, 0.005],
        ):
            self.jobs._run("job-1")

        job = self.jobs.get("job-1")
        self.assertEqual(job["status"], "done")
        self.assertFalse(job["budget_hit"])
        self.assertEqual(job["progress_pct"], 100)
        self.assertEqual(job["processed"], 2)
        self.assertEqual(job["metrics"][3]["mode"], "medido")

    def test_run_estimates_naive_duration_when_budget_is_hit(self) -> None:
        patients = server.build_synthetic_patients(3)

        class FakeQueue:
            def __init__(self) -> None:
                self.items: list[object] = []

            def enqueue(self, patient: object) -> None:
                self.items.append(patient)

            def dequeue_next(self) -> object | None:
                if self.items:
                    return self.items.pop(0)
                return None

        self.jobs._jobs["job-2"] = {
            "job_id": "job-2",
            "count": 3,
            "status": "queued",
            "progress_pct": 0,
            "stage_label": "queued",
            "processed": 0,
            "elapsed_ms": 0.0,
            "note": "",
            "metrics": None,
            "budget_hit": False,
            "cancelled": False,
            "error": None,
            "source": "api-local",
        }

        with patch.object(server, "PROGRESS_BATCH_SIZE", 1), patch.object(server, "build_synthetic_patients", return_value=patients), patch.object(server, "order_triage_queue", side_effect=lambda items: list(items)), patch.object(server, "TriageBucketQueue", FakeQueue), patch.object(
            server,
            "perf_counter",
            side_effect=[0.0, 0.001, 0.001, 0.002, 0.002, 0.003, 0.003, 4.004, 4.005],
        ):
            self.jobs._run("job-2")

        job = self.jobs.get("job-2")
        self.assertEqual(job["status"], "done")
        self.assertTrue(job["budget_hit"])
        self.assertEqual(job["metrics"][3]["mode"], "estimado")
        self.assertIn("extrapolado", job["note"])

    def test_run_marks_job_as_cancelled_when_flag_is_set(self) -> None:
        self.jobs._jobs["job-3"] = {
            "job_id": "job-3",
            "count": 1,
            "status": "queued",
            "progress_pct": 0,
            "stage_label": "queued",
            "processed": 0,
            "elapsed_ms": 0.0,
            "note": "",
            "metrics": None,
            "budget_hit": False,
            "cancelled": True,
            "error": None,
            "source": "api-local",
        }

        self.jobs._run("job-3")

        job = self.jobs.get("job-3")
        self.assertEqual(job["status"], "cancelled")
        self.assertEqual(job["stage_label"], "Job cancelado")

    def test_run_marks_job_as_error_when_exception_happens(self) -> None:
        self.jobs._jobs["job-4"] = {
            "job_id": "job-4",
            "count": 1,
            "status": "queued",
            "progress_pct": 0,
            "stage_label": "queued",
            "processed": 0,
            "elapsed_ms": 0.0,
            "note": "",
            "metrics": None,
            "budget_hit": False,
            "cancelled": False,
            "error": None,
            "source": "api-local",
        }

        with patch.object(server, "build_synthetic_patients", side_effect=RuntimeError("boom")):
            self.jobs._run("job-4")

        job = self.jobs.get("job-4")
        self.assertEqual(job["status"], "error")
        self.assertEqual(job["error"], "boom")


class ShowcaseHandlerTests(unittest.TestCase):
    def make_handler(self, path: str) -> server.ShowcaseHandler:
        handler = server.ShowcaseHandler.__new__(server.ShowcaseHandler)
        handler.path = path
        return handler

    def test_init_passes_showcase_directory_to_base_handler(self) -> None:
        captured: dict[str, object] = {}

        def fake_init(self: object, *args: object, **kwargs: object) -> None:
            captured["directory"] = kwargs["directory"]

        with patch.object(server.SimpleHTTPRequestHandler, "__init__", fake_init):
            server.ShowcaseHandler("request", "client", "server")

        self.assertEqual(captured["directory"], str(server.SHOWCASE_DIR))

    def test_get_health_endpoint(self) -> None:
        handler = self.make_handler("/api/health")
        captured: dict[str, object] = {}
        handler._write_json = lambda status, payload: captured.update(status=status, payload=payload)  # type: ignore[method-assign]

        server.ShowcaseHandler.do_GET(handler)

        self.assertEqual(captured["status"], server.HTTPStatus.OK)
        self.assertEqual(captured["payload"], {"ok": True})

    def test_get_job_endpoint_returns_not_found(self) -> None:
        handler = self.make_handler("/api/triage-simulations/missing")
        captured: dict[str, object] = {}
        handler._write_json = lambda status, payload: captured.update(status=status, payload=payload)  # type: ignore[method-assign]

        with patch.object(server.JOBS, "get", return_value=None):
            server.ShowcaseHandler.do_GET(handler)

        self.assertEqual(captured["status"], server.HTTPStatus.NOT_FOUND)

    def test_get_job_endpoint_returns_job_payload(self) -> None:
        handler = self.make_handler("/api/triage-simulations/job-1")
        captured: dict[str, object] = {}
        handler._write_json = lambda status, payload: captured.update(status=status, payload=payload)  # type: ignore[method-assign]

        with patch.object(server.JOBS, "get", return_value={"job_id": "job-1", "status": "done"}):
            server.ShowcaseHandler.do_GET(handler)

        self.assertEqual(captured["status"], server.HTTPStatus.OK)
        self.assertEqual(captured["payload"]["job_id"], "job-1")

    def test_get_root_rewrites_to_index(self) -> None:
        handler = self.make_handler("/")

        with patch.object(server.SimpleHTTPRequestHandler, "do_GET", autospec=True) as base_get:
            server.ShowcaseHandler.do_GET(handler)

        self.assertEqual(handler.path, "/index.html")
        base_get.assert_called_once_with(handler)

    def test_post_create_job_validates_positive_count(self) -> None:
        handler = self.make_handler("/api/triage-simulations")
        captured: dict[str, object] = {}
        handler._write_json = lambda status, payload: captured.update(status=status, payload=payload)  # type: ignore[method-assign]
        handler._read_json = lambda: {"count": 0}  # type: ignore[method-assign]

        server.ShowcaseHandler.do_POST(handler)

        self.assertEqual(captured["status"], server.HTTPStatus.BAD_REQUEST)

    def test_post_create_job_returns_job_id(self) -> None:
        handler = self.make_handler("/api/triage-simulations")
        captured: dict[str, object] = {}
        handler._write_json = lambda status, payload: captured.update(status=status, payload=payload)  # type: ignore[method-assign]
        handler._read_json = lambda: {"count": 3500}  # type: ignore[method-assign]

        with patch.object(server.JOBS, "create", return_value="job-7") as create:
            server.ShowcaseHandler.do_POST(handler)

        create.assert_called_once_with(3500)
        self.assertEqual(captured["status"], server.HTTPStatus.ACCEPTED)
        self.assertEqual(captured["payload"], {"job_id": "job-7"})

    def test_post_cancel_returns_not_found(self) -> None:
        handler = self.make_handler("/api/triage-simulations/job-9/cancel")
        captured: dict[str, object] = {}
        handler._write_json = lambda status, payload: captured.update(status=status, payload=payload)  # type: ignore[method-assign]

        with patch.object(server.JOBS, "cancel", return_value=None):
            server.ShowcaseHandler.do_POST(handler)

        self.assertEqual(captured["status"], server.HTTPStatus.NOT_FOUND)

    def test_post_cancel_returns_ok(self) -> None:
        handler = self.make_handler("/api/triage-simulations/job-9/cancel")
        captured: dict[str, object] = {}
        handler._write_json = lambda status, payload: captured.update(status=status, payload=payload)  # type: ignore[method-assign]

        with patch.object(server.JOBS, "cancel", return_value={"job_id": "job-9"}):
            server.ShowcaseHandler.do_POST(handler)

        self.assertEqual(captured["status"], server.HTTPStatus.OK)
        self.assertEqual(captured["payload"]["status"], "cancelled")

    def test_post_returns_not_found_for_unknown_endpoint(self) -> None:
        handler = self.make_handler("/api/unknown")
        captured: dict[str, object] = {}
        handler._write_json = lambda status, payload: captured.update(status=status, payload=payload)  # type: ignore[method-assign]

        server.ShowcaseHandler.do_POST(handler)

        self.assertEqual(captured["status"], server.HTTPStatus.NOT_FOUND)

    def test_read_json_handles_empty_and_payload(self) -> None:
        handler = self.make_handler("/api/triage-simulations")
        handler.headers = {"Content-Length": "0"}
        handler.rfile = io.BytesIO(b"")
        self.assertEqual(server.ShowcaseHandler._read_json(handler), {})

        handler.headers = {"Content-Length": "4"}
        handler.rfile = io.BytesIO(b"")
        self.assertEqual(server.ShowcaseHandler._read_json(handler), {})

        handler.headers = {"Content-Length": "13"}
        handler.rfile = io.BytesIO(b'{"count": 2}')
        self.assertEqual(server.ShowcaseHandler._read_json(handler), {"count": 2})

    def test_write_json_serializes_response(self) -> None:
        handler = self.make_handler("/api/triage-simulations")
        recorded: list[tuple[str, object]] = []
        handler.wfile = io.BytesIO()
        handler.send_response = lambda status: recorded.append(("status", status))  # type: ignore[method-assign]
        handler.send_header = lambda name, value: recorded.append((name, value))  # type: ignore[method-assign]
        handler.end_headers = lambda: recorded.append(("end", None))  # type: ignore[method-assign]

        server.ShowcaseHandler._write_json(handler, server.HTTPStatus.ACCEPTED, {"job_id": "job-1"})

        self.assertIn(("status", 202), recorded)
        self.assertIn(("Content-Type", "application/json; charset=utf-8"), recorded)
        self.assertIn(("Cache-Control", "no-store"), recorded)
        self.assertEqual(handler.wfile.getvalue(), b'{"job_id": "job-1"}')

    def test_log_message_writes_stdout(self) -> None:
        handler = self.make_handler("/")
        handler.client_address = ("127.0.0.1", 12345)
        stdout = io.StringIO()

        with patch.object(server.sys, "stdout", stdout):
            server.ShowcaseHandler.log_message(handler, "hello %s", "world")

        self.assertIn("[showcase] 127.0.0.1 - hello world", stdout.getvalue())


class ShowcaseMainTests(unittest.TestCase):
    def test_main_closes_server_after_keyboard_interrupt(self) -> None:
        events: list[str] = []

        class FakeServer:
            def __init__(self, address: tuple[str, int], handler_cls: object) -> None:
                events.append(f"init:{address[0]}:{address[1]}")

            def serve_forever(self) -> None:
                events.append("serve")
                raise KeyboardInterrupt

            def server_close(self) -> None:
                events.append("close")

        with patch.object(server.argparse.ArgumentParser, "parse_args", return_value=types.SimpleNamespace(host="127.0.0.1", port=9999)), patch.object(server, "ThreadingHTTPServer", FakeServer), contextlib.redirect_stdout(io.StringIO()):
            exit_code = server.main()

        self.assertEqual(exit_code, 0)
        self.assertEqual(events, ["init:127.0.0.1:9999", "serve", "close"])

    def test_main_module_branch_raises_system_exit_zero(self) -> None:
        events: list[str] = []

        class FakeServer:
            def __init__(self, address: tuple[str, int], handler_cls: object) -> None:
                events.append(f"init:{address[0]}:{address[1]}")

            def serve_forever(self) -> None:
                events.append("serve")
                raise KeyboardInterrupt

            def server_close(self) -> None:
                events.append("close")

        server_path = Path(server.__file__).resolve()
        with patch.object(argparse.ArgumentParser, "parse_args", return_value=types.SimpleNamespace(host="127.0.0.1", port=8787)), patch("http.server.ThreadingHTTPServer", FakeServer), contextlib.redirect_stdout(io.StringIO()):
            with self.assertRaises(SystemExit) as raised:
                runpy.run_path(str(server_path), run_name="__main__")

        self.assertEqual(raised.exception.code, 0)
        self.assertEqual(events, ["init:127.0.0.1:8787", "serve", "close"])


if __name__ == "__main__":
    unittest.main()
