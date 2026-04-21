using TaskBoard.Api.Dtos;
using TaskBoard.Api.Models;
using TaskBoard.Api.Repositories;
using TaskBoard.Api.Services;

namespace TaskBoard.Api.Tests;

[Trait("Scope", "Backend")]
public sealed class TaskServiceTests
{
    private static TaskService CreateService()
    {
        return new TaskService(new InMemoryTaskRepository());
    }

    [Fact]
    public void Create_TrimsTitle_AndDefaultsStatusToPending()
    {
        var service = CreateService();

        var result = service.Create(new CreateTaskRequest("  Call patient  "));

        Assert.True(result.IsSuccess);
        Assert.Equal("Call patient", result.Value!.Title);
        Assert.Equal("pending", result.Value.Status);
    }

    [Fact]
    public void Create_RejectsBlankTitle()
    {
        var service = CreateService();

        var result = service.Create(new CreateTaskRequest("   "));

        Assert.Equal(ServiceErrorType.Validation, result.ErrorType);
        Assert.Equal("Title is required.", result.ErrorMessage);
    }

    [Fact]
    public void Create_RejectsTitleLongerThan120Characters()
    {
        var service = CreateService();
        var title = new string('A', 121);

        var result = service.Create(new CreateTaskRequest(title));

        Assert.Equal(ServiceErrorType.Validation, result.ErrorType);
        Assert.Equal("Title must be at most 120 characters.", result.ErrorMessage);
    }

    [Fact]
    public void List_RejectsInvalidStatus()
    {
        var service = CreateService();

        var result = service.List("archived");

        Assert.Equal(ServiceErrorType.Validation, result.ErrorType);
        Assert.Equal("Status must be pending or completed.", result.ErrorMessage);
    }

    [Fact]
    public void Get_ReturnsExistingTask()
    {
        var service = CreateService();
        var created = service.Create(new CreateTaskRequest("Review request")).Value!;

        var result = service.Get(created.Id);

        Assert.True(result.IsSuccess);
        Assert.Equal(created.Id, result.Value!.Id);
        Assert.Equal("Review request", result.Value.Title);
    }

    [Fact]
    public void Update_RequiresAtLeastOneField()
    {
        var service = CreateService();
        var created = service.Create(new CreateTaskRequest("Review request")).Value!;

        var result = service.Update(created.Id, new UpdateTaskRequest(null, null));

        Assert.Equal(ServiceErrorType.Validation, result.ErrorType);
        Assert.Equal("At least one updatable field must be provided.", result.ErrorMessage);
    }

    [Fact]
    public void Update_DoesNotChangeTimestamp_WhenPayloadDoesNotChangeTask()
    {
        var service = CreateService();
        var created = service.Create(new CreateTaskRequest("Review request")).Value!;

        var result = service.Update(
            created.Id,
            new UpdateTaskRequest("Review request", "pending"));

        Assert.True(result.IsSuccess);
        Assert.Equal(created.UpdatedAt, result.Value!.UpdatedAt);
    }

    [Fact]
    public void Update_ValidatesStatusAndTitle()
    {
        var service = CreateService();
        var created = service.Create(new CreateTaskRequest("Review request")).Value!;

        var invalidStatus = service.Update(created.Id, new UpdateTaskRequest(null, "done"));
        Assert.Equal(ServiceErrorType.Validation, invalidStatus.ErrorType);

        var invalidTitle = service.Update(created.Id, new UpdateTaskRequest("", null));
        Assert.Equal(ServiceErrorType.Validation, invalidTitle.ErrorType);

        var updated = service.Update(
            created.Id,
            new UpdateTaskRequest("Review request again", "completed"));

        Assert.True(updated.IsSuccess);
        Assert.Equal("Review request again", updated.Value!.Title);
        Assert.Equal("completed", updated.Value.Status);
        Assert.True(updated.Value.UpdatedAt >= created.UpdatedAt);
    }

    [Fact]
    public void Delete_RemovesExistingTask()
    {
        var service = CreateService();
        var created = service.Create(new CreateTaskRequest("Delete this")).Value!;

        var deleteResult = service.Delete(created.Id);
        var getResult = service.Get(created.Id);

        Assert.True(deleteResult.IsSuccess);
        Assert.Equal(ServiceErrorType.NotFound, getResult.ErrorType);
    }

    [Fact]
    public void Repository_Update_ReturnsNull_WhenTaskDoesNotExist()
    {
        var repository = new InMemoryTaskRepository();
        var now = DateTimeOffset.UtcNow;
        var unknownTask = new BoardTask(Guid.NewGuid(), "Missing", "pending", now, now);

        var result = repository.Update(unknownTask);

        Assert.Null(result);
    }

    [Fact]
    public void Repository_PreservesConcurrentWrites()
    {
        var repository = new InMemoryTaskRepository();

        Parallel.For(
            0,
            200,
            index =>
            {
                var now = DateTimeOffset.UtcNow;
                repository.Add(
                    new TaskBoard.Api.Models.BoardTask(
                        Guid.NewGuid(),
                        $"Task {index}",
                        "pending",
                        now,
                        now));
            });

        Assert.Equal(200, repository.List(null).Count);
    }
}
