# Kata 2 Requirements

## Ambiguities

- Is task ownership single-user or multi-user?
- Should authentication be included now or deferred?
- What exact status values are allowed?
- Should task titles be unique?
- What is the maximum accepted title length?
- Should deletion be permanent or archived as a soft delete?
- Is priority part of the first delivery or a backlog item?
- Should completed tasks keep a completion timestamp?

## Decisions for This Implementation

- The board is single-user and has no authentication.
- Allowed statuses are `pending` and `completed`.
- A title is required, trimmed, and limited to 120 characters.
- Titles do not need to be unique.
- Delete is a hard delete.
- Priority is documented as a future backlog item.
- Tasks keep `createdAt` and `updatedAt`; no separate completion timestamp is required.

## API Contract

### `GET /tasks`

Returns all tasks ordered by creation date.

Optional query:

- `status=pending`
- `status=completed`

Invalid statuses return `400 Bad Request`.

### `GET /tasks/{id}`

Returns one task by ID or `404 Not Found`.

### `POST /tasks`

Creates a task.

Request:

```json
{
  "title": "Call patient"
}
```

Response:

- `201 Created` with the created task.
- `400 Bad Request` when the title is blank or too long.

### `PATCH /tasks/{id}`

Updates task title and/or status.

Request:

```json
{
  "title": "Call patient again",
  "status": "completed"
}
```

Response:

- `200 OK` with the updated task.
- `400 Bad Request` for validation errors.
- `404 Not Found` for unknown IDs.

### `DELETE /tasks/{id}`

Deletes a task.

Response:

- `204 No Content` on success.
- `404 Not Found` for unknown IDs.
