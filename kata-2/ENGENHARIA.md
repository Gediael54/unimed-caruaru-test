# Kata 2 Engineering Notes

## Backend Design

The backend uses a small layered structure:

- Controller: maps HTTP requests and responses.
- Service: owns validation and task rules.
- Repository: stores and retrieves tasks.
- DTOs: keep request and response contracts separate from storage models.

The repository is in-memory to keep the kata focused. It is protected by a lock so concurrent requests cannot corrupt the dictionary.

## Production Reliability

For production, the API should add:

- Automated unit and integration tests.
- Structured logs with request IDs.
- Health checks for dependencies.
- Metrics for latency, throughput, validation failures, and error rates.
- Durable database persistence.
- Database migrations and rollback plans.
- OpenAPI documentation generated from the controller contract.

## Security Controls in This Kata

The implementation includes package-free hardening appropriate for the kata scope:

- Request bodies are limited to 16 KB.
- JSON depth is limited.
- CORS only allows `http://localhost:5173`.
- Task titles are trimmed and capped at 120 characters.
- Status values are allow-listed as `pending` or `completed`.
- Error responses return controlled messages instead of stack traces.
- API responses include defensive headers:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: no-referrer`
  - restrictive `Content-Security-Policy`

This does not prove that the system has zero vulnerabilities. It documents the local controls and keeps the attack surface small by avoiding unnecessary dependencies.

## Multi-User and Authentication Changes

To support multiple users:

- Add an identity provider or authentication service.
- Add a user or owner field to tasks.
- Scope all reads and writes by the authenticated user.
- Add authorization checks in the service layer.
- Add audit logs for create, update, complete, and delete actions.
- Consider optimistic concurrency if multiple sessions can edit the same task.

## Frontend Design

The frontend is intentionally simple:

- It loads tasks from the API.
- It creates tasks with a required title.
- It filters by status.
- It can mark tasks as completed.
- It can delete tasks.

The UI keeps API errors visible and disables controls while requests are in progress.
