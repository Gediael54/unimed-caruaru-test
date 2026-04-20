using TaskBoard.Api.Dtos;
using TaskBoard.Api.Models;
using TaskBoard.Api.Repositories;

namespace TaskBoard.Api.Services;

public sealed class TaskService(ITaskRepository repository)
{
    private const int MaxTitleLength = 120;

    public ServiceResult<IReadOnlyList<TaskResponse>> List(string? status)
    {
        var normalizedStatus = NormalizeOptionalStatus(status);
        if (normalizedStatus.Error is not null)
        {
            return ServiceResult<IReadOnlyList<TaskResponse>>.Validation(normalizedStatus.Error);
        }

        var tasks = repository
            .List(normalizedStatus.Value)
            .Select(ToResponse)
            .ToList();

        return ServiceResult<IReadOnlyList<TaskResponse>>.Success(tasks);
    }

    public ServiceResult<TaskResponse> Get(Guid id)
    {
        var task = repository.Get(id);
        if (task is null)
        {
            return ServiceResult<TaskResponse>.NotFound("Task not found.");
        }

        return ServiceResult<TaskResponse>.Success(ToResponse(task));
    }

    public ServiceResult<TaskResponse> Create(CreateTaskRequest request)
    {
        var title = NormalizeTitle(request.Title);
        if (title.Error is not null)
        {
            return ServiceResult<TaskResponse>.Validation(title.Error);
        }

        var now = DateTimeOffset.UtcNow;
        var task = new BoardTask(
            Guid.NewGuid(),
            title.Value!,
            TaskStatuses.Pending,
            now,
            now);

        repository.Add(task);

        return ServiceResult<TaskResponse>.Success(ToResponse(task));
    }

    public ServiceResult<TaskResponse> Update(Guid id, UpdateTaskRequest request)
    {
        var current = repository.Get(id);
        if (current is null)
        {
            return ServiceResult<TaskResponse>.NotFound("Task not found.");
        }

        var nextTitle = current.Title;
        if (request.Title is not null)
        {
            var normalizedTitle = NormalizeTitle(request.Title);
            if (normalizedTitle.Error is not null)
            {
                return ServiceResult<TaskResponse>.Validation(normalizedTitle.Error);
            }

            nextTitle = normalizedTitle.Value!;
        }

        var nextStatus = current.Status;
        if (request.Status is not null)
        {
            var normalizedStatus = NormalizeRequiredStatus(request.Status);
            if (normalizedStatus.Error is not null)
            {
                return ServiceResult<TaskResponse>.Validation(normalizedStatus.Error);
            }

            nextStatus = normalizedStatus.Value!;
        }

        var updated = current with
        {
            Title = nextTitle,
            Status = nextStatus,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

        repository.Update(updated);

        return ServiceResult<TaskResponse>.Success(ToResponse(updated));
    }

    public ServiceResult<bool> Delete(Guid id)
    {
        return repository.Delete(id)
            ? ServiceResult<bool>.Success(true)
            : ServiceResult<bool>.NotFound("Task not found.");
    }

    private static TaskResponse ToResponse(BoardTask task)
    {
        return new TaskResponse(
            task.Id,
            task.Title,
            task.Status,
            task.CreatedAt,
            task.UpdatedAt);
    }

    private static NormalizedValue NormalizeTitle(string? title)
    {
        var normalizedTitle = title?.Trim();
        if (string.IsNullOrWhiteSpace(normalizedTitle))
        {
            return NormalizedValue.Invalid("Title is required.");
        }

        if (normalizedTitle.Length > MaxTitleLength)
        {
            return NormalizedValue.Invalid($"Title must be at most {MaxTitleLength} characters.");
        }

        return NormalizedValue.Valid(normalizedTitle);
    }

    private static NormalizedValue NormalizeOptionalStatus(string? status)
    {
        if (string.IsNullOrWhiteSpace(status))
        {
            return NormalizedValue.Valid(null);
        }

        return NormalizeRequiredStatus(status);
    }

    private static NormalizedValue NormalizeRequiredStatus(string status)
    {
        var normalizedStatus = status.Trim().ToLowerInvariant();
        if (!TaskStatuses.IsValid(normalizedStatus))
        {
            return NormalizedValue.Invalid("Status must be pending or completed.");
        }

        return NormalizedValue.Valid(normalizedStatus);
    }

    private sealed record NormalizedValue(string? Value, string? Error)
    {
        public static NormalizedValue Valid(string? value)
        {
            return new NormalizedValue(value, null);
        }

        public static NormalizedValue Invalid(string error)
        {
            return new NormalizedValue(null, error);
        }
    }
}
