from __future__ import annotations

import io
import subprocess
import unittest
from unittest.mock import patch

import server


class ShowcaseHelpersTests(unittest.TestCase):
    def test_public_command_spec_hides_internal_fields(self) -> None:
        spec = server.public_command_spec(server.COMMAND_SPECS[0])

        self.assertIn("id", spec)
        self.assertNotIn("argv", spec)
        self.assertNotIn("timeout_s", spec)

    def test_public_command_spec_exposes_access_links_when_present(self) -> None:
        spec = server.public_command_spec(server.COMMANDS_BY_ID["kata2-dev"])

        self.assertIn("access_links", spec)
        self.assertEqual(spec["access_links"][0]["label"], "Abrir frontend")

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

    def test_trim_output_keeps_tail_when_output_is_too_large(self) -> None:
        text = "x" * (server.MAX_COMMAND_OUTPUT_CHARS + 10)
        trimmed = server.trim_output(text)

        self.assertIn("saida truncada", trimmed)
        self.assertLessEqual(len(trimmed), server.MAX_COMMAND_OUTPUT_CHARS + 64)

    def test_summarize_command_output_keeps_terminal_metadata(self) -> None:
        summary = server.summarize_command_output("\x1b[32mok\x1b[0m\nlinha 2\n")

        self.assertEqual(summary["output_format"], "ansi")
        self.assertEqual(summary["output_line_count"], 2)
        self.assertEqual(summary["output_char_count"], len("\x1b[32mok\x1b[0m\nlinha 2\n"))
        self.assertFalse(summary["output_truncated"])

    def test_public_doc_spec_hides_content(self) -> None:
        spec = server.public_doc_spec(server.DOC_SPECS[0])

        self.assertEqual(spec["id"], "repo-readme")
        self.assertNotIn("content", spec)

    def test_read_doc_payload_returns_content_for_known_doc(self) -> None:
        payload = server.read_doc_payload("repo-readme")

        self.assertIsNotNone(payload)
        self.assertEqual(payload["id"], "repo-readme")
        self.assertIn("Teste Técnico Unimed Caruaru", payload["content"])

    def test_read_doc_payload_returns_none_for_unknown_doc(self) -> None:
        self.assertIsNone(server.read_doc_payload("missing"))

    def test_read_index_html_with_version_replaces_asset_token(self) -> None:
        html = server.read_index_html_with_version()

        self.assertIn("styles.css?v=", html)
        self.assertNotIn(server.SHOWCASE_ASSET_VERSION_TOKEN, html)
        self.assertIn(server.build_showcase_asset_version(), html)


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

    def test_cancel_returns_none_for_unknown_job(self) -> None:
        self.assertIsNone(self.jobs.cancel("missing"))

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


class CommandRunsTests(unittest.TestCase):
    def setUp(self) -> None:
        self.runs = server.CommandRuns()

    def test_create_rejects_unknown_command(self) -> None:
        with self.assertRaises(KeyError):
            self.runs.create("missing")

    def test_create_rejects_non_runnable_command(self) -> None:
        with self.assertRaises(ValueError):
            self.runs.create("kata1-explore")

    def test_create_registers_queued_run_and_starts_thread(self) -> None:
        started: dict[str, object] = {}

        class FakeThread:
            def __init__(self, *thread_args: object, target=None, args=(), daemon=None, **thread_kwargs: object) -> None:
                started["target"] = target
                started["args"] = args
                started["daemon"] = daemon

            def start(self) -> None:
                started["started"] = True

        with patch.object(server.uuid, "uuid4", return_value="run-fixed"), patch.object(server.threading, "Thread", FakeThread):
            run_id = self.runs.create("repo-help")

        run = self.runs.get(run_id)
        self.assertEqual(run_id, "run-fixed")
        self.assertEqual(run["status"], "queued")
        self.assertEqual(run["command_id"], "repo-help")
        self.assertEqual(run["stage_label"], "Na fila do showcase")
        self.assertFalse(run["is_running"])
        self.assertIsNotNone(run["created_at"])
        self.assertIsNone(run["finished_at"])
        self.assertTrue(started["started"])
        self.assertEqual(started["args"][0], "run-fixed")

    def test_build_command_run_keeps_access_links(self) -> None:
        run = server.build_command_run("run-1", server.COMMANDS_BY_ID["kata2-dev"])

        self.assertIn("access_links", run)
        self.assertEqual(run["access_links"][0]["url"], "http://localhost:5173")

    def test_cancel_returns_none_for_unknown_run(self) -> None:
        self.assertIsNone(self.runs.cancel("missing"))

    def test_cancel_marks_job_and_terminates_process(self) -> None:
        class FakeProcess:
            def __init__(self) -> None:
                self.terminated = False

            def terminate(self) -> None:
                self.terminated = True

        process = FakeProcess()
        self.runs._jobs["run-1"] = {
            "run_id": "run-1",
            "status": "running",
            "stage_label": "Processo iniciado",
            "cancelled": False,
            "note": "old",
        }
        self.runs._processes["run-1"] = process

        run = self.runs.cancel("run-1")

        self.assertTrue(run["cancelled"])
        self.assertEqual(run["note"], "cancelamento solicitado")
        self.assertEqual(run["stage_label"], "Cancelamento solicitado")
        self.assertTrue(process.terminated)

    def test_run_marks_done_on_success(self) -> None:
        class FakeProcess:
            def __init__(self, *args: object, **kwargs: object) -> None:
                self.returncode = 0
                self.pid = 4321

            def communicate(self, timeout=None):  # noqa: ANN001
                return ("ok output", "")

        self.runs._jobs["run-1"] = {
            "run_id": "run-1",
            "command_id": "repo-help",
            "scope": "repo",
            "title": "Runner · Ajuda completa",
            "runner_command": "bash scripts/kata.sh help",
            "manual_command": "bash scripts/kata.sh help",
            "status": "queued",
            "stage_label": "Na fila do showcase",
            "created_at": "2026-04-22T12:00:00Z",
            "updated_at": "2026-04-22T12:00:00Z",
            "started_at": None,
            "finished_at": None,
            "completed_at": None,
            "duration_ms": None,
            "exit_code": None,
            "timed_out": False,
            "cancelled": False,
            "is_running": False,
            "output": "",
            "output_format": "plain",
            "output_truncated": False,
            "output_char_count": 0,
            "output_line_count": 0,
            "note": "job criado",
            "pid": None,
        }

        with patch.object(server.subprocess, "Popen", FakeProcess), patch.object(server, "perf_counter", side_effect=[0.0, 0.25]):
            self.runs._run("run-1", server.COMMANDS_BY_ID["repo-help"])

        run = self.runs.get("run-1")
        self.assertEqual(run["status"], "done")
        self.assertEqual(run["stage_label"], "Execução concluída")
        self.assertEqual(run["exit_code"], 0)
        self.assertEqual(run["pid"], 4321)
        self.assertIsNotNone(run["started_at"])
        self.assertIsNotNone(run["finished_at"])
        self.assertEqual(run["finished_at"], run["completed_at"])
        self.assertFalse(run["is_running"])
        self.assertEqual(run["output_format"], "plain")
        self.assertEqual(run["output_line_count"], 1)
        self.assertIn("ok output", run["output"])

    def test_run_marks_error_on_timeout(self) -> None:
        class FakeProcess:
            def __init__(self, *args: object, **kwargs: object) -> None:
                self.returncode = -9
                self.pid = 999
                self.calls = 0

            def communicate(self, timeout=None):  # noqa: ANN001
                self.calls += 1
                if self.calls == 1:
                    raise subprocess.TimeoutExpired(cmd=["bash"], timeout=timeout)
                return ("timed out output", "")

            def kill(self) -> None:
                self.returncode = -9

        self.runs._jobs["run-2"] = {
            "run_id": "run-2",
            "command_id": "repo-help",
            "scope": "repo",
            "title": "Runner · Ajuda completa",
            "runner_command": "bash scripts/kata.sh help",
            "manual_command": "bash scripts/kata.sh help",
            "status": "queued",
            "stage_label": "Na fila do showcase",
            "created_at": "2026-04-22T12:00:00Z",
            "updated_at": "2026-04-22T12:00:00Z",
            "started_at": None,
            "finished_at": None,
            "completed_at": None,
            "duration_ms": None,
            "exit_code": None,
            "timed_out": False,
            "cancelled": False,
            "is_running": False,
            "output": "",
            "output_format": "plain",
            "output_truncated": False,
            "output_char_count": 0,
            "output_line_count": 0,
            "note": "job criado",
            "pid": None,
        }

        with patch.object(server.subprocess, "Popen", FakeProcess), patch.object(server, "perf_counter", side_effect=[0.0, 0.5]):
            self.runs._run("run-2", server.COMMANDS_BY_ID["repo-help"])

        run = self.runs.get("run-2")
        self.assertEqual(run["status"], "error")
        self.assertTrue(run["timed_out"])
        self.assertEqual(run["stage_label"], "Tempo limite excedido")
        self.assertFalse(run["is_running"])
        self.assertIsNotNone(run["finished_at"])
        self.assertIn("tempo limite", run["note"])

    def test_cancel_queued_run_finishes_without_spawning_process(self) -> None:
        self.runs._jobs["run-3"] = server.build_command_run("run-3", server.COMMANDS_BY_ID["repo-help"])

        run = self.runs.cancel("run-3")

        self.assertEqual(run["status"], "cancelled")
        self.assertEqual(run["stage_label"], "Execução cancelada")
        self.assertFalse(run["is_running"])
        self.assertIsNotNone(run["finished_at"])


class ShowcaseHandlerTests(unittest.TestCase):
    def make_handler(self, path: str, body: bytes = b"{}") -> server.ShowcaseHandler:
        handler = server.ShowcaseHandler.__new__(server.ShowcaseHandler)
        handler.path = path
        handler.headers = {"Content-Length": str(len(body))}
        handler.rfile = io.BytesIO(body)
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
        self.assertTrue(captured["payload"]["ok"])

    def test_get_root_returns_index_html_with_asset_version(self) -> None:
        handler = self.make_handler("/")
        captured: dict[str, object] = {}
        handler._write_html = lambda status, html: captured.update(status=status, html=html)  # type: ignore[method-assign]

        with patch.object(server, "read_index_html_with_version", return_value="<html>ok</html>"):
            server.ShowcaseHandler.do_GET(handler)

        self.assertEqual(captured["status"], server.HTTPStatus.OK)
        self.assertEqual(captured["html"], "<html>ok</html>")

    def test_get_commands_endpoint(self) -> None:
        handler = self.make_handler("/api/commands")
        captured: dict[str, object] = {}
        handler._write_json = lambda status, payload: captured.update(status=status, payload=payload)  # type: ignore[method-assign]

        server.ShowcaseHandler.do_GET(handler)

        self.assertEqual(captured["status"], server.HTTPStatus.OK)
        self.assertGreater(len(captured["payload"]["commands"]), 0)

    def test_get_docs_endpoint(self) -> None:
        handler = self.make_handler("/api/docs")
        captured: dict[str, object] = {}
        handler._write_json = lambda status, payload: captured.update(status=status, payload=payload)  # type: ignore[method-assign]

        server.ShowcaseHandler.do_GET(handler)

        self.assertEqual(captured["status"], server.HTTPStatus.OK)
        self.assertGreater(len(captured["payload"]["docs"]), 0)

    def test_get_doc_returns_not_found(self) -> None:
        handler = self.make_handler("/api/docs/missing")
        captured: dict[str, object] = {}
        handler._write_json = lambda status, payload: captured.update(status=status, payload=payload)  # type: ignore[method-assign]

        server.ShowcaseHandler.do_GET(handler)

        self.assertEqual(captured["status"], server.HTTPStatus.NOT_FOUND)

    def test_get_doc_returns_content(self) -> None:
        handler = self.make_handler("/api/docs/repo-readme")
        captured: dict[str, object] = {}
        handler._write_json = lambda status, payload: captured.update(status=status, payload=payload)  # type: ignore[method-assign]

        server.ShowcaseHandler.do_GET(handler)

        self.assertEqual(captured["status"], server.HTTPStatus.OK)
        self.assertIn("content", captured["payload"])

    def test_get_command_run_returns_not_found(self) -> None:
        handler = self.make_handler("/api/command-runs/missing")
        captured: dict[str, object] = {}
        handler._write_json = lambda status, payload: captured.update(status=status, payload=payload)  # type: ignore[method-assign]

        with patch.object(server.COMMAND_RUNS, "get", return_value=None):
            server.ShowcaseHandler.do_GET(handler)

        self.assertEqual(captured["status"], server.HTTPStatus.NOT_FOUND)

    def test_get_command_run_returns_rich_payload(self) -> None:
        handler = self.make_handler("/api/command-runs/run-1")
        captured: dict[str, object] = {}
        handler._write_json = lambda status, payload: captured.update(status=status, payload=payload)  # type: ignore[method-assign]

        with patch.object(
            server.COMMAND_RUNS,
            "get",
            return_value={
                "run_id": "run-1",
                "status": "running",
                "stage_label": "Processo iniciado · aguardando saída",
                "started_at": "2026-04-22T12:00:00Z",
                "finished_at": None,
                "completed_at": None,
                "is_running": True,
                "output": "",
            },
        ):
            server.ShowcaseHandler.do_GET(handler)

        self.assertEqual(captured["status"], server.HTTPStatus.OK)
        self.assertEqual(captured["payload"]["stage_label"], "Processo iniciado · aguardando saída")
        self.assertTrue(captured["payload"]["is_running"])

    def test_post_command_run_requires_command_id(self) -> None:
        handler = self.make_handler("/api/command-runs", body=b"{}")
        captured: dict[str, object] = {}
        handler._write_json = lambda status, payload: captured.update(status=status, payload=payload)  # type: ignore[method-assign]

        server.ShowcaseHandler.do_POST(handler)

        self.assertEqual(captured["status"], server.HTTPStatus.BAD_REQUEST)
        self.assertEqual(captured["payload"]["error"], "command_id is required")

    def test_post_command_run_returns_not_found_for_unknown_command(self) -> None:
        handler = self.make_handler("/api/command-runs", body=b'{"command_id":"missing"}')
        captured: dict[str, object] = {}
        handler._write_json = lambda status, payload: captured.update(status=status, payload=payload)  # type: ignore[method-assign]

        with patch.object(server.COMMAND_RUNS, "create", side_effect=KeyError("missing")):
            server.ShowcaseHandler.do_POST(handler)

        self.assertEqual(captured["status"], server.HTTPStatus.NOT_FOUND)

    def test_post_command_run_rejects_non_runnable_command(self) -> None:
        handler = self.make_handler("/api/command-runs", body=b'{"command_id":"kata1-explore"}')
        captured: dict[str, object] = {}
        handler._write_json = lambda status, payload: captured.update(status=status, payload=payload)  # type: ignore[method-assign]

        with patch.object(server.COMMAND_RUNS, "create", side_effect=ValueError("kata1-explore")):
            server.ShowcaseHandler.do_POST(handler)

        self.assertEqual(captured["status"], server.HTTPStatus.BAD_REQUEST)

    def test_post_command_run_returns_accepted(self) -> None:
        handler = self.make_handler("/api/command-runs", body=b'{"command_id":"repo-help"}')
        captured: dict[str, object] = {}
        handler._write_json = lambda status, payload: captured.update(status=status, payload=payload)  # type: ignore[method-assign]

        with patch.object(server.COMMAND_RUNS, "create", return_value="run-123"), patch.object(
            server.COMMAND_RUNS,
            "get",
            return_value={
                "run_id": "run-123",
                "status": "queued",
                "stage_label": "Na fila do showcase",
                "is_running": False,
            },
        ):
            server.ShowcaseHandler.do_POST(handler)

        self.assertEqual(captured["status"], server.HTTPStatus.ACCEPTED)
        self.assertEqual(captured["payload"]["run_id"], "run-123")
        self.assertEqual(captured["payload"]["run"]["stage_label"], "Na fila do showcase")

    def test_post_command_run_cancel_returns_not_found(self) -> None:
        handler = self.make_handler("/api/command-runs/run-1/cancel")
        captured: dict[str, object] = {}
        handler._write_json = lambda status, payload: captured.update(status=status, payload=payload)  # type: ignore[method-assign]

        with patch.object(server.COMMAND_RUNS, "cancel", return_value=None):
            server.ShowcaseHandler.do_POST(handler)

        self.assertEqual(captured["status"], server.HTTPStatus.NOT_FOUND)

    def test_post_command_run_cancel_returns_ok(self) -> None:
        handler = self.make_handler("/api/command-runs/run-1/cancel")
        captured: dict[str, object] = {}
        handler._write_json = lambda status, payload: captured.update(status=status, payload=payload)  # type: ignore[method-assign]

        with patch.object(server.COMMAND_RUNS, "cancel", return_value={"status": "cancelled"}):
            server.ShowcaseHandler.do_POST(handler)

        self.assertEqual(captured["status"], server.HTTPStatus.OK)
        self.assertEqual(captured["payload"]["status"], "cancelled")


class MainTests(unittest.TestCase):
    def test_main_handles_keyboard_interrupt_and_closes_server(self) -> None:
        captured: dict[str, object] = {}

        class FakeServer:
            def __init__(self, address, handler):  # noqa: ANN001
                captured["address"] = address
                captured["handler"] = handler
                captured["closed"] = False

            def serve_forever(self) -> None:
                raise KeyboardInterrupt()

            def server_close(self) -> None:
                captured["closed"] = True

        with patch.object(server, "ThreadingHTTPServer", FakeServer), patch.object(server.argparse.ArgumentParser, "parse_args", return_value=type("Args", (), {"host": "127.0.0.1", "port": 9000})()):
            exit_code = server.main()

        self.assertEqual(exit_code, 0)
        self.assertEqual(captured["address"], ("127.0.0.1", 9000))
        self.assertTrue(captured["closed"])


if __name__ == "__main__":
    unittest.main()
