namespace TaskBoard.Api.Dtos;

public sealed record TaskResponse(
    Guid Id,
    string Title,
    string Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);
