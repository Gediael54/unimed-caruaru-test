namespace TaskBoard.Api.Dtos;

public sealed record UpdateTaskRequest(
    string? Title,
    string? Description,
    string? Priority,
    string? Status);
