using System.Reflection;
using Microsoft.AspNetCore.Mvc;
using TaskBoard.Api.Controllers;
using TaskBoard.Api.Dtos;
using TaskBoard.Api.Repositories;
using TaskBoard.Api.Services;

namespace TaskBoard.Api.Tests;

[Trait("Scope", "Api")]
public sealed class TasksControllerTests
{
    private static TasksController CreateController(ITaskRepository? repository = null)
    {
        return new TasksController(new TaskService(repository ?? new InMemoryTaskRepository()));
    }

    [Fact]
    public void GetById_ReturnsOk_WhenTaskExists()
    {
        var repository = new InMemoryTaskRepository();
        var service = new TaskService(repository);
        var created = service.Create(new CreateTaskRequest("Review exam")).Value!;
        var controller = CreateController(repository);

        var result = controller.GetById(created.Id);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsType<TaskResponse>(ok.Value);
        Assert.Equal(created.Id, payload.Id);
        Assert.Equal("Review exam", payload.Title);
    }

    [Fact]
    public void GetById_ReturnsNotFound_WhenTaskDoesNotExist()
    {
        var controller = CreateController();

        var result = controller.GetById(Guid.NewGuid());

        var notFound = Assert.IsType<ObjectResult>(result.Result);
        var problem = Assert.IsType<ProblemDetails>(notFound.Value);
        Assert.Equal(404, notFound.StatusCode);
        Assert.Equal("Task not found.", problem.Detail);
    }

    [Fact]
    public void Create_ReturnsBadRequest_WhenBodyIsMissing()
    {
        var controller = CreateController();

        var result = controller.Create(null);

        var badRequest = Assert.IsType<ObjectResult>(result.Result);
        var problem = Assert.IsType<ProblemDetails>(badRequest.Value);
        Assert.Equal(400, badRequest.StatusCode);
        Assert.Equal("Request body is required.", problem.Detail);
    }

    [Fact]
    public void Update_ReturnsBadRequest_WhenBodyIsMissing()
    {
        var controller = CreateController();

        var result = controller.Update(Guid.NewGuid(), null);

        var badRequest = Assert.IsType<ObjectResult>(result.Result);
        var problem = Assert.IsType<ProblemDetails>(badRequest.Value);
        Assert.Equal(400, badRequest.StatusCode);
        Assert.Equal("Request body is required.", problem.Detail);
    }

    [Fact]
    public void Update_ReturnsOk_WhenTaskExists()
    {
        var repository = new InMemoryTaskRepository();
        var service = new TaskService(repository);
        var created = service.Create(new CreateTaskRequest("Review exam")).Value!;
        var controller = CreateController(repository);

        var result = controller.Update(created.Id, new UpdateTaskRequest("Review exam again", "completed"));

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsType<TaskResponse>(ok.Value);
        Assert.Equal("Review exam again", payload.Title);
        Assert.Equal("completed", payload.Status);
    }

    [Fact]
    public void ToProblem_ReturnsInternalServerError_ForUnknownErrorType()
    {
        var controller = CreateController();
        var result = new ServiceResult<TaskResponse>(
            default,
            (ServiceErrorType)999,
            "Unexpected failure.");

        var toProblem = typeof(TasksController)
            .GetMethod("ToProblem", BindingFlags.Instance | BindingFlags.NonPublic)!
            .MakeGenericMethod(typeof(TaskResponse));

        var response = Assert.IsType<ObjectResult>(toProblem.Invoke(controller, [result]));
        var problem = Assert.IsType<ProblemDetails>(response.Value);

        Assert.Equal(500, response.StatusCode);
        Assert.Equal("Unexpected error", problem.Title);
        Assert.Equal("Unexpected failure.", problem.Detail);
    }
}
