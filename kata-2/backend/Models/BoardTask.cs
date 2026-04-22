namespace TaskBoard.Api.Models;

public sealed record BoardTask(
    Guid Id,
    string Title,
    string? Description,
    string Priority,
    string Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    DateTimeOffset? ArchivedAt);
