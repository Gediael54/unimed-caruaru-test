using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using TaskBoard.Api.Controllers;
using TaskBoard.Api.Dtos;
using TaskBoard.Api.Infrastructure;
using TaskBoard.Api.Repositories;
using TaskBoard.Api.Services;

namespace TaskBoard.Api.Tests.Runner;

internal static class TestHarnessProgram
{
    public static async Task<int> Main(string[] args)
    {
        var scope = args.Length == 0 ? "all" : args[0].Trim().ToLowerInvariant();

        var tests = new List<TestCase>
        {
            new("backend", "create trims title and defaults to pending", CreateTrimsTitleAndDefaultsToPending),
            new("backend", "create rejects blank title", CreateRejectsBlankTitle),
            new("backend", "create rejects title above max length", CreateRejectsTitleAboveMaxLength),
            new("backend", "list rejects invalid status", ListRejectsInvalidStatus),
            new("backend", "update requires at least one field", UpdateRequiresAtLeastOneField),
            new("backend", "update preserves timestamp when payload is idempotent", UpdatePreservesTimestampWhenPayloadIsIdempotent),
            new("backend", "update validates status and title", UpdateValidatesStatusAndTitle),
            new("backend", "delete removes existing task", DeleteRemovesExistingTask),
            new("backend", "repository handles concurrent writes", RepositoryHandlesConcurrentWrites),
            new("api", "controller create returns 201 with task payload", ControllerCreateReturnsCreatedResponse),
            new("api", "controller list returns 200 with created tasks", ControllerListReturnsOkWithTasks),
            new("api", "controller list rejects invalid filter with problem details", ControllerListRejectsInvalidStatus),
            new("api", "controller create rejects title above max length", ControllerCreateRejectsTitleAboveMaxLength),
            new("api", "controller update returns 404 for missing task", ControllerUpdateReturnsNotFoundForMissingTask),
            new("api", "controller update rejects empty patch payload", ControllerUpdateRejectsEmptyPatchPayload),
            new("api", "controller update rejects invalid status", ControllerUpdateRejectsInvalidStatus),
            new("api", "controller delete returns 204 for existing task", ControllerDeleteReturnsNoContentForExistingTask),
            new("api", "controller delete returns 404 for missing task", ControllerDeleteReturnsNotFoundForMissingTask),
            new("api", "controller create rejects missing body", ControllerCreateRejectsMissingBody),
            new("api", "security headers are applied consistently", SecurityHeadersAreAppliedConsistently),
            new("api", "api configuration exposes expected defaults", ApiConfigurationExposesExpectedDefaults),
        };

        var selectedTests = tests
            .Where(test => scope is "all" || test.Scope == scope)
            .ToList();

        if (selectedTests.Count == 0)
        {
            Console.Error.WriteLine($"Unknown test scope: {scope}");
            return 2;
        }

        var failures = 0;
        foreach (var test in selectedTests)
        {
            try
            {
                await test.Run();
                Console.WriteLine($"PASS [{test.Scope}] {test.Name}");
            }
            catch (Exception exception)
            {
                failures++;
                Console.Error.WriteLine($"FAIL [{test.Scope}] {test.Name}: {exception.Message}");
            }
        }

        return failures == 0 ? 0 : 1;
    }

    private static TaskService NewService()
    {
        return new TaskService(new InMemoryTaskRepository());
    }

    private static TasksController NewController(ITaskRepository? repository = null)
    {
        var taskRepository = repository ?? new InMemoryTaskRepository();
        return new TasksController(new TaskService(taskRepository));
    }

    private static async Task CreateTrimsTitleAndDefaultsToPending()
    {
        var service = NewService();

        var result = service.Create(new CreateTaskRequest("  Call patient  "));

        AssertTrue(result.IsSuccess, "Expected create to succeed.");
        AssertEqual("Call patient", result.Value!.Title, "Expected title to be trimmed.");
        AssertEqual("pending", result.Value.Status, "Expected pending status.");
        await Task.CompletedTask;
    }

    private static async Task CreateRejectsBlankTitle()
    {
        var service = NewService();

        var result = service.Create(new CreateTaskRequest("   "));

        AssertEqual(ServiceErrorType.Validation, result.ErrorType, "Expected validation error.");
        AssertEqual("Title is required.", result.ErrorMessage, "Expected validation message.");
        await Task.CompletedTask;
    }

    private static async Task ListRejectsInvalidStatus()
    {
        var service = NewService();

        var result = service.List("archived");

        AssertEqual(ServiceErrorType.Validation, result.ErrorType, "Expected validation error.");
        await Task.CompletedTask;
    }

    private static async Task CreateRejectsTitleAboveMaxLength()
    {
        var service = NewService();
        var result = service.Create(new CreateTaskRequest(new string('A', 121)));

        AssertEqual(ServiceErrorType.Validation, result.ErrorType, "Expected title length validation.");
        AssertEqual(
            "Title must be at most 120 characters.",
            result.ErrorMessage,
            "Expected max length validation message.");
        await Task.CompletedTask;
    }

    private static async Task UpdateRequiresAtLeastOneField()
    {
        var service = NewService();
        var created = service.Create(new CreateTaskRequest("Review request")).Value!;

        var result = service.Update(created.Id, new UpdateTaskRequest(null, null));

        AssertEqual(ServiceErrorType.Validation, result.ErrorType, "Expected validation error.");
        AssertEqual(
            "At least one updatable field must be provided.",
            result.ErrorMessage,
            "Expected empty patch validation.");
        await Task.CompletedTask;
    }

    private static async Task UpdatePreservesTimestampWhenPayloadIsIdempotent()
    {
        var service = NewService();
        var created = service.Create(new CreateTaskRequest("Review request")).Value!;

        var result = service.Update(created.Id, new UpdateTaskRequest("Review request", "pending"));

        AssertTrue(result.IsSuccess, "Expected update to succeed.");
        AssertEqual(created.UpdatedAt, result.Value!.UpdatedAt, "Expected unchanged timestamp.");
        await Task.CompletedTask;
    }

    private static async Task UpdateValidatesStatusAndTitle()
    {
        var service = NewService();
        var created = service.Create(new CreateTaskRequest("Review request")).Value!;

        var invalidStatus = service.Update(created.Id, new UpdateTaskRequest(null, "done"));
        AssertEqual(ServiceErrorType.Validation, invalidStatus.ErrorType, "Expected invalid status.");

        var invalidTitle = service.Update(created.Id, new UpdateTaskRequest("", null));
        AssertEqual(ServiceErrorType.Validation, invalidTitle.ErrorType, "Expected invalid title.");

        var updated = service.Update(
            created.Id,
            new UpdateTaskRequest("Review request again", "completed"));

        AssertTrue(updated.IsSuccess, "Expected update to succeed.");
        AssertEqual("Review request again", updated.Value!.Title, "Expected updated title.");
        AssertEqual("completed", updated.Value.Status, "Expected completed status.");
        await Task.CompletedTask;
    }

    private static async Task DeleteRemovesExistingTask()
    {
        var service = NewService();
        var created = service.Create(new CreateTaskRequest("Delete this")).Value!;

        var deleteResult = service.Delete(created.Id);
        var getResult = service.Get(created.Id);

        AssertTrue(deleteResult.IsSuccess, "Expected delete to succeed.");
        AssertEqual(ServiceErrorType.NotFound, getResult.ErrorType, "Expected task to be gone.");
        await Task.CompletedTask;
    }

    private static async Task RepositoryHandlesConcurrentWrites()
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

        AssertEqual(200, repository.List(null).Count, "Expected all concurrent writes to be preserved.");
        await Task.CompletedTask;
    }

    private static async Task ControllerCreateReturnsCreatedResponse()
    {
        var controller = NewController();

        var result = controller.Create(new CreateTaskRequest("  Check lab result  "));
        var created = AssertIsType<CreatedAtActionResult>(result.Result, "Expected CreatedAtActionResult.");
        var task = AssertIsType<TaskResponse>(created.Value, "Expected TaskResponse payload.");

        AssertEqual(nameof(TasksController.GetById), created.ActionName, "Expected location to point to GetById.");
        AssertEqual("Check lab result", task.Title, "Expected trimmed title.");
        AssertEqual("pending", task.Status, "Expected pending status.");
        await Task.CompletedTask;
    }

    private static async Task ControllerListRejectsInvalidStatus()
    {
        var controller = NewController();

        var result = controller.List("archived");
        var badRequest = AssertIsType<ObjectResult>(result.Result, "Expected ObjectResult.");
        var problem = AssertIsType<ProblemDetails>(badRequest.Value, "Expected ProblemDetails.");

        AssertEqual(400, badRequest.StatusCode, "Expected bad request.");
        AssertEqual("Validation error", problem.Title, "Expected controlled problem title.");
        AssertEqual("Status must be pending or completed.", problem.Detail, "Expected controlled error detail.");
        await Task.CompletedTask;
    }

    private static async Task ControllerListReturnsOkWithTasks()
    {
        var repository = new InMemoryTaskRepository();
        var service = new TaskService(repository);
        service.Create(new CreateTaskRequest("Check lab result"));
        service.Create(new CreateTaskRequest("Review claim"));
        var controller = NewController(repository);

        var result = controller.List(null);
        var ok = AssertIsType<OkObjectResult>(result.Result, "Expected OkObjectResult.");
        var tasks = AssertIsType<IReadOnlyList<TaskResponse>>(ok.Value, "Expected task list payload.");

        AssertTrue(tasks.Count >= 2, "Expected at least two tasks in list.");
        AssertTrue(tasks.Any(task => task.Title == "Check lab result"), "Expected first created task.");
        AssertTrue(tasks.Any(task => task.Title == "Review claim"), "Expected second created task.");
        await Task.CompletedTask;
    }

    private static async Task ControllerCreateRejectsTitleAboveMaxLength()
    {
        var controller = NewController();

        var result = controller.Create(new CreateTaskRequest(new string('A', 121)));
        var badRequest = AssertIsType<ObjectResult>(result.Result, "Expected ObjectResult.");
        var problem = AssertIsType<ProblemDetails>(badRequest.Value, "Expected ProblemDetails.");

        AssertEqual(400, badRequest.StatusCode, "Expected bad request.");
        AssertEqual("Title must be at most 120 characters.", problem.Detail, "Expected max length detail.");
        await Task.CompletedTask;
    }

    private static async Task ControllerUpdateReturnsNotFoundForMissingTask()
    {
        var controller = NewController();

        var result = controller.Update(Guid.NewGuid(), new UpdateTaskRequest(null, "completed"));
        var notFound = AssertIsType<ObjectResult>(result.Result, "Expected ObjectResult.");
        var problem = AssertIsType<ProblemDetails>(notFound.Value, "Expected ProblemDetails.");

        AssertEqual(404, notFound.StatusCode, "Expected not found.");
        AssertEqual("Task not found.", problem.Detail, "Expected not found message.");
        await Task.CompletedTask;
    }

    private static async Task ControllerUpdateRejectsEmptyPatchPayload()
    {
        var repository = new InMemoryTaskRepository();
        var service = new TaskService(repository);
        var created = service.Create(new CreateTaskRequest("Review exam")).Value!;
        var controller = NewController(repository);

        var result = controller.Update(created.Id, new UpdateTaskRequest(null, null));
        var badRequest = AssertIsType<ObjectResult>(result.Result, "Expected ObjectResult.");
        var problem = AssertIsType<ProblemDetails>(badRequest.Value, "Expected ProblemDetails.");

        AssertEqual(400, badRequest.StatusCode, "Expected bad request.");
        AssertEqual("At least one updatable field must be provided.", problem.Detail, "Expected detail.");
        await Task.CompletedTask;
    }

    private static async Task ControllerUpdateRejectsInvalidStatus()
    {
        var repository = new InMemoryTaskRepository();
        var service = new TaskService(repository);
        var created = service.Create(new CreateTaskRequest("Review exam")).Value!;
        var controller = NewController(repository);

        var result = controller.Update(created.Id, new UpdateTaskRequest(null, "done"));
        var badRequest = AssertIsType<ObjectResult>(result.Result, "Expected ObjectResult.");
        var problem = AssertIsType<ProblemDetails>(badRequest.Value, "Expected ProblemDetails.");

        AssertEqual(400, badRequest.StatusCode, "Expected bad request.");
        AssertEqual("Status must be pending or completed.", problem.Detail, "Expected invalid status detail.");
        await Task.CompletedTask;
    }

    private static async Task ControllerDeleteReturnsNoContentForExistingTask()
    {
        var repository = new InMemoryTaskRepository();
        var service = new TaskService(repository);
        var created = service.Create(new CreateTaskRequest("Review exam")).Value!;
        var controller = NewController(repository);

        var result = controller.Delete(created.Id);

        AssertIsType<NoContentResult>(result, "Expected no content.");
        await Task.CompletedTask;
    }

    private static async Task ControllerDeleteReturnsNotFoundForMissingTask()
    {
        var controller = NewController();

        var result = controller.Delete(Guid.NewGuid());
        var notFound = AssertIsType<ObjectResult>(result, "Expected ObjectResult.");
        var problem = AssertIsType<ProblemDetails>(notFound.Value, "Expected ProblemDetails.");

        AssertEqual(404, notFound.StatusCode, "Expected not found.");
        AssertEqual("Task not found.", problem.Detail, "Expected not found message.");
        await Task.CompletedTask;
    }

    private static async Task ControllerCreateRejectsMissingBody()
    {
        var controller = NewController();

        var result = controller.Create(null);
        var badRequest = AssertIsType<ObjectResult>(result.Result, "Expected ObjectResult.");
        var problem = AssertIsType<ProblemDetails>(badRequest.Value, "Expected ProblemDetails.");

        AssertEqual(400, badRequest.StatusCode, "Expected bad request.");
        AssertEqual("Request body is required.", problem.Detail, "Expected body required message.");
        await Task.CompletedTask;
    }

    private static async Task SecurityHeadersAreAppliedConsistently()
    {
        var context = new DefaultHttpContext();

        ApiSecurityHeaders.Apply(context.Response.Headers);

        AssertEqual("nosniff", context.Response.Headers["X-Content-Type-Options"].ToString(), "Expected nosniff header.");
        AssertEqual("DENY", context.Response.Headers["X-Frame-Options"].ToString(), "Expected frame deny header.");
        AssertEqual("no-referrer", context.Response.Headers["Referrer-Policy"].ToString(), "Expected referrer policy.");
        AssertEqual("default-src 'none'; frame-ancestors 'none'; base-uri 'none'", context.Response.Headers["Content-Security-Policy"].ToString(), "Expected CSP.");
        await Task.CompletedTask;
    }

    private static async Task ApiConfigurationExposesExpectedDefaults()
    {
        var options = new TaskBoardApiOptions();

        AssertEqual("frontend", TaskBoardApiConfiguration.FrontendCorsPolicy, "Expected stable CORS policy name.");
        AssertEqual("http://localhost:5173", options.FrontendOrigin, "Expected frontend origin.");
        AssertEqual(16, options.JsonMaxDepth, "Expected JSON depth limit.");
        AssertEqual(16 * 1024L, options.MaxRequestBodySizeBytes, "Expected request body limit.");
        await Task.CompletedTask;
    }

    private static T AssertIsType<T>(object? value, string message)
    {
        if (value is not T typedValue)
        {
            throw new InvalidOperationException(message);
        }

        return typedValue;
    }

    private static void AssertTrue(bool condition, string message)
    {
        if (!condition)
        {
            throw new InvalidOperationException(message);
        }
    }

    private static void AssertEqual<T>(T expected, T actual, string message)
    {
        if (!EqualityComparer<T>.Default.Equals(expected, actual))
        {
            throw new InvalidOperationException($"{message} Expected {expected}, got {actual}.");
        }
    }

    private sealed record TestCase(string Scope, string Name, Func<Task> Run);
}
