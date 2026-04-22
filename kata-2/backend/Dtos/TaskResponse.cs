namespace TaskBoard.Api.Dtos;

public sealed record TaskResponse(
    Guid Id,
    string Title,
    string? Description,
    string Priority,
    string Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    DateTimeOffset? ArchivedAt);
