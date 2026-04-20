from __future__ import annotations

import json
import subprocess
import time
import unittest
import urllib.error
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BACKEND_PROJECT = ROOT / "backend" / "TaskBoard.Api.csproj"
BASE_URL = "http://127.0.0.1:5055"


class ApiClient:
    def request(self, method: str, path: str, body: dict[str, object] | None = None):
        data = None
        headers = {"Accept": "application/json"}
        if body is not None:
            data = json.dumps(body).encode("utf-8")
            headers["Content-Type"] = "application/json"

        request = urllib.request.Request(
            f"{BASE_URL}{path}",
            data=data,
            headers=headers,
            method=method,
        )

        try:
            with urllib.request.urlopen(request, timeout=5) as response:
                raw_body = response.read().decode("utf-8")
                parsed_body = json.loads(raw_body) if raw_body else None
                return response.status, dict(response.headers), parsed_body
        except urllib.error.HTTPError as error:
            raw_body = error.read().decode("utf-8")
            parsed_body = json.loads(raw_body) if raw_body else None
            return error.code, dict(error.headers), parsed_body


class TaskBoardApiIntegrationTests(unittest.TestCase):
    process: subprocess.Popen[str]
    client: ApiClient

    @classmethod
    def setUpClass(cls) -> None:
        cls.process = subprocess.Popen(
            [
                "dotnet",
                "run",
                "--project",
                str(BACKEND_PROJECT),
                "--urls",
                BASE_URL,
            ],
            cwd=ROOT,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )
        cls.client = ApiClient()
        cls.wait_until_ready()

    @classmethod
    def tearDownClass(cls) -> None:
        cls.process.terminate()
        try:
            cls.process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            cls.process.kill()
            cls.process.wait(timeout=10)

    @classmethod
    def wait_until_ready(cls) -> None:
        deadline = time.time() + 40
        last_output = ""
        while time.time() < deadline:
            if cls.process.poll() is not None:
                if cls.process.stdout is not None:
                    last_output += cls.process.stdout.read()
                raise RuntimeError(f"API exited before startup:\n{last_output}")

            try:
                status, _, _ = cls.client.request("GET", "/health")
                if status == 200:
                    return
            except Exception:
                time.sleep(0.5)

        if cls.process.stdout is not None:
            last_output += cls.process.stdout.read()
        raise RuntimeError(f"API did not become ready:\n{last_output}")

    def test_health_endpoint_includes_security_headers(self) -> None:
        status, headers, body = self.client.request("GET", "/health")

        self.assertEqual(status, 200)
        self.assertEqual(body["status"], "healthy")
        self.assertEqual(headers["X-Content-Type-Options"], "nosniff")
        self.assertEqual(headers["X-Frame-Options"], "DENY")

    def test_create_list_complete_and_delete_task(self) -> None:
        create_status, _, created = self.client.request(
            "POST", "/tasks", {"title": "  Confirm appointment  "}
        )
        self.assertEqual(create_status, 201)
        self.assertEqual(created["title"], "Confirm appointment")
        self.assertEqual(created["status"], "pending")

        list_status, _, pending_tasks = self.client.request("GET", "/tasks?status=pending")
        self.assertEqual(list_status, 200)
        self.assertTrue(any(task["id"] == created["id"] for task in pending_tasks))

        update_status, _, updated = self.client.request(
            "PATCH", f"/tasks/{created['id']}", {"status": "completed"}
        )
        self.assertEqual(update_status, 200)
        self.assertEqual(updated["status"], "completed")

        delete_status, _, _ = self.client.request("DELETE", f"/tasks/{created['id']}")
        self.assertEqual(delete_status, 204)

        get_status, _, _ = self.client.request("GET", f"/tasks/{created['id']}")
        self.assertEqual(get_status, 404)

    def test_validation_errors_are_controlled(self) -> None:
        status, _, body = self.client.request("POST", "/tasks", {"title": ""})
        self.assertEqual(status, 400)
        self.assertEqual(body["error"], "Title is required.")

        status, _, body = self.client.request("GET", "/tasks?status=archived")
        self.assertEqual(status, 400)
        self.assertEqual(body["error"], "Status must be pending or completed.")

        long_title = "x" * 121
        status, _, body = self.client.request("POST", "/tasks", {"title": long_title})
        self.assertEqual(status, 400)
        self.assertEqual(body["error"], "Title must be at most 120 characters.")


if __name__ == "__main__":
    unittest.main()
