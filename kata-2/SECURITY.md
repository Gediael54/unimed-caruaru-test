# Security Notes

## Scope

This kata is a single-user task board without authentication. The security goal is to keep the implementation small, explicit, and resistant to common avoidable mistakes within that scope.

## Implemented Controls

- Input validation for task titles and statuses.
- Maximum task title length of 120 characters.
- Maximum request body size of 16 KB.
- JSON depth limit.
- CORS restricted to the local frontend origin.
- Controlled error messages.
- No database credentials, secrets, or environment-specific tokens.
- No dynamic SQL or shell execution.
- Defensive response headers in the API.

## Residual Risks

- In-memory storage is not durable and is not appropriate for production.
- There is no authentication or authorization because the requirement was scoped as a single-user board.
- Transport security depends on the deployment environment. Local development runs over HTTP.
- Dependency scanning should be run in CI after frontend dependencies are installed.

## Recommended Production Additions

- HTTPS-only deployment with HSTS.
- Authentication through a trusted identity provider.
- Per-user authorization checks.
- Durable persistence with migrations.
- Rate limiting.
- Centralized logs, metrics, and alerting.
- Automated dependency and container scanning.
