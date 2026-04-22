using TaskBoard.Api.Dtos;
using TaskBoard.Api.Models;
using TaskBoard.Api.Repositories;

namespace TaskBoard.Api.Services;

public sealed class TaskService(ITaskRepository repository)
{
    private const int MaxTitleLength = 120;
    private const int MaxDescriptionLength = 600;

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

        var description = NormalizeDescription(request.Description);
        if (description.Error is not null)
        {
            return ServiceResult<TaskResponse>.Validation(description.Error);
        }

        var priority = NormalizeOptionalPriority(request.Priority, defaultValue: TaskPriorities.Medium);
        if (priority.Error is not null)
        {
            return ServiceResult<TaskResponse>.Validation(priority.Error);
        }

        var now = DateTimeOffset.UtcNow;
        var task = new BoardTask(
            Guid.NewGuid(),
            title.Value!,
            description.Value,
            priority.Value!,
            TaskStatuses.Pending,
            now,
            now,
            null);

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

        if (request.Title is null && request.Description is null && request.Priority is null && request.Status is null)
        {
            return ServiceResult<TaskResponse>.Validation(
                "At least one updatable field must be provided.");
        }

        var nextTitle = current.Title;
        var nextDescription = current.Description;
        var nextPriority = current.Priority;
        if (request.Title is not null)
        {
            var normalizedTitle = NormalizeTitle(request.Title);
            if (normalizedTitle.Error is not null)
            {
                return ServiceResult<TaskResponse>.Validation(normalizedTitle.Error);
            }

            nextTitle = normalizedTitle.Value!;
        }

        if (request.Description is not null)
        {
            var normalizedDescription = NormalizeDescription(request.Description);
            if (normalizedDescription.Error is not null)
            {
                return ServiceResult<TaskResponse>.Validation(normalizedDescription.Error);
            }

            nextDescription = normalizedDescription.Value;
        }

        if (request.Priority is not null)
        {
            var normalizedPriority = NormalizeRequiredPriority(request.Priority);
            if (normalizedPriority.Error is not null)
            {
                return ServiceResult<TaskResponse>.Validation(normalizedPriority.Error);
            }

            nextPriority = normalizedPriority.Value!;
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

        if (nextTitle == current.Title
            && nextDescription == current.Description
            && nextPriority == current.Priority
            && nextStatus == current.Status)
        {
            return ServiceResult<TaskResponse>.Success(ToResponse(current));
        }

        DateTimeOffset? nextArchivedAt = nextStatus == TaskStatuses.Archived
            ? current.ArchivedAt ?? DateTimeOffset.UtcNow
            : null;

        var updated = current with
        {
            Title = nextTitle,
            Description = nextDescription,
            Priority = nextPriority,
            Status = nextStatus,
            UpdatedAt = DateTimeOffset.UtcNow,
            ArchivedAt = nextArchivedAt,
        };

        repository.Update(updated);

        return ServiceResult<TaskResponse>.Success(ToResponse(updated));
    }

    public ServiceResult<bool> Delete(Guid id)
    {
        var current = repository.Get(id);
        if (current is null)
        {
            return ServiceResult<bool>.NotFound("Task not found.");
        }

        if (current.Status == TaskStatuses.Archived)
        {
            return ServiceResult<bool>.Success(true);
        }

        var archived = current with
        {
            Status = TaskStatuses.Archived,
            UpdatedAt = DateTimeOffset.UtcNow,
            ArchivedAt = DateTimeOffset.UtcNow,
        };

        repository.Update(archived);

        return ServiceResult<bool>.Success(true);
    }

    private static TaskResponse ToResponse(BoardTask task)
    {
        return new TaskResponse(
            task.Id,
            task.Title,
            task.Description,
            task.Priority,
            task.Status,
            task.CreatedAt,
            task.UpdatedAt,
            task.ArchivedAt);
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
            return NormalizedValue.Invalid("Status must be pending, in_progress, completed, cancelled or archived.");
        }

        return NormalizedValue.Valid(normalizedStatus);
    }

    private static NormalizedValue NormalizeDescription(string? description)
    {
        if (description is null)
        {
            return NormalizedValue.Valid(null);
        }

        var normalizedDescription = description.Trim();
        if (string.IsNullOrWhiteSpace(normalizedDescription))
        {
            return NormalizedValue.Valid(null);
        }

        if (normalizedDescription.Length > MaxDescriptionLength)
        {
            return NormalizedValue.Invalid($"Description must be at most {MaxDescriptionLength} characters.");
        }

        return NormalizedValue.Valid(normalizedDescription);
    }

    private static NormalizedValue NormalizeOptionalPriority(string? priority, string defaultValue)
    {
        if (string.IsNullOrWhiteSpace(priority))
        {
            return NormalizedValue.Valid(defaultValue);
        }

        return NormalizeRequiredPriority(priority);
    }

    private static NormalizedValue NormalizeRequiredPriority(string priority)
    {
        var normalizedPriority = priority.Trim().ToLowerInvariant();
        if (!TaskPriorities.IsValid(normalizedPriority))
        {
            return NormalizedValue.Invalid("Priority must be low, medium or high.");
        }

        return NormalizedValue.Valid(normalizedPriority);
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
