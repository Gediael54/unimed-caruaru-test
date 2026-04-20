# Kata 2 Architecture

## Goals

The task board is intentionally small, but it still keeps clear boundaries so the code is easy to review and extend.

## Backend Structure

- `Controllers/`: HTTP routing, status codes, and request/response mapping.
- `Dtos/`: public API contracts.
- `Models/`: internal domain/storage models.
- `Repositories/`: persistence boundary. The current implementation is in-memory.
- `Services/`: validation and business rules.

The controller does not own task rules. The repository does not validate business input. DTOs keep external contracts separate from internal models.

## Frontend Structure

- `src/api.ts`: API client functions.
- `src/types.ts`: task types shared by the UI and API client.
- `src/App.tsx`: task board behavior and rendering.
- `src/styles.css`: layout and visual rules.

For a larger app, the next step would be splitting `App.tsx` into `components/`, `services/`, and `models/`. For this kata, the current structure keeps the surface area small without hiding the main flow.

## System Design

The frontend talks to the backend over HTTP. During local development, Vite proxies `/tasks` to `http://localhost:5000`. The backend keeps tasks in memory because the requirement does not demand durable persistence.

Production evolution should add a database, authentication, ownership checks, observability, and migration management before supporting real users.
