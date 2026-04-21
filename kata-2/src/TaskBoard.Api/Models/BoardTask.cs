namespace TaskBoard.Api.Models;

public sealed record BoardTask(
    Guid Id,
    string Title,
    string Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);
