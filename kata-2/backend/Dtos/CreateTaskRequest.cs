namespace TaskBoard.Api.Dtos;

public sealed record CreateTaskRequest(string Title, string? Description = null, string? Priority = null);
