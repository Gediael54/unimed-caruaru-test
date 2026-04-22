using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using TaskBoard.Api.Dtos;
using TaskBoard.Api.Infrastructure;
using TaskBoard.Api.Tests.Infrastructure;

namespace TaskBoard.Api.Tests;

[Trait("Scope", "Api")]
public sealed class TasksApiTests : IClassFixture<TaskBoardWebApplicationFactory>
{
    private readonly HttpClient client;
    private readonly TaskBoardWebApplicationFactory factory;

    public TasksApiTests(TaskBoardWebApplicationFactory factory)
    {
        this.factory = factory;
        client = factory.CreateClient();
    }

    [Fact]
    public async Task Create_ReturnsCreatedPayload_AndLocationHeader()
    {
        var response = await client.PostAsJsonAsync(
            "/tasks",
            new CreateTaskRequest("  Check lab result  ", "Call before noon", "high"));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.NotNull(response.Headers.Location);

        var task = await response.Content.ReadFromJsonAsync<TaskResponse>();
        Assert.NotNull(task);
        Assert.Equal("Check lab result", task!.Title);
        Assert.Equal("Call before noon", task.Description);
        Assert.Equal("high", task.Priority);
        Assert.Equal("pending", task.Status);
    }

    [Fact]
    public async Task List_ReturnsOk_WithCreatedTasks()
    {
        await client.PostAsJsonAsync("/tasks", new CreateTaskRequest("Check lab result"));
        await client.PostAsJsonAsync("/tasks", new CreateTaskRequest("Review claim"));

        var response = await client.GetAsync("/tasks");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var tasks = await response.Content.ReadFromJsonAsync<List<TaskResponse>>();
        Assert.NotNull(tasks);
        Assert.True(tasks!.Count >= 2);
        Assert.Contains(tasks, task => task.Title == "Check lab result");
        Assert.Contains(tasks, task => task.Title == "Review claim");
    }

    [Fact]
    public async Task List_RejectsInvalidStatus_WithProblemDetails()
    {
        var response = await client.GetAsync("/tasks?status=done");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.NotNull(problem);
        Assert.Equal("Validation error", problem!.Title);
        Assert.Equal("Status must be pending, in_progress, completed, cancelled or archived.", problem.Detail);
    }

    [Fact]
    public async Task Create_RejectsTitleAboveMaxLength()
    {
        var response = await client.PostAsJsonAsync("/tasks", new CreateTaskRequest(new string('A', 121)));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.NotNull(problem);
        Assert.Equal("Validation error", problem!.Title);
        Assert.Equal("Title must be at most 120 characters.", problem.Detail);
    }

    [Fact]
    public async Task Update_ReturnsNotFound_WhenTaskDoesNotExist()
    {
        var response = await client.PatchAsJsonAsync(
            $"/tasks/{Guid.NewGuid()}",
            new UpdateTaskRequest(null, null, null, "completed"));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);

        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.NotNull(problem);
        Assert.Equal("Resource not found", problem!.Title);
        Assert.Equal("Task not found.", problem.Detail);
    }

    [Fact]
    public async Task Update_RejectsEmptyPatchPayload()
    {
        var createResponse = await client.PostAsJsonAsync("/tasks", new CreateTaskRequest("Review exam"));
        var created = await createResponse.Content.ReadFromJsonAsync<TaskResponse>();

        var response = await client.PatchAsJsonAsync(
            $"/tasks/{created!.Id}",
            new UpdateTaskRequest(null, null, null, null));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.NotNull(problem);
        Assert.Equal("At least one updatable field must be provided.", problem!.Detail);
    }

    [Fact]
    public async Task Update_RejectsInvalidStatus()
    {
        var createResponse = await client.PostAsJsonAsync("/tasks", new CreateTaskRequest("Review exam"));
        var created = await createResponse.Content.ReadFromJsonAsync<TaskResponse>();

        var response = await client.PatchAsJsonAsync(
            $"/tasks/{created!.Id}",
            new UpdateTaskRequest(null, null, null, "done"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.NotNull(problem);
        Assert.Equal("Validation error", problem!.Title);
        Assert.Equal("Status must be pending, in_progress, completed, cancelled or archived.", problem.Detail);
    }

    [Fact]
    public async Task Delete_ReturnsNoContent_AndArchivesTask_WhenTaskExists()
    {
        var createResponse = await client.PostAsJsonAsync("/tasks", new CreateTaskRequest("Review exam"));
        var created = await createResponse.Content.ReadFromJsonAsync<TaskResponse>();

        var response = await client.DeleteAsync($"/tasks/{created!.Id}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Empty(await response.Content.ReadAsByteArrayAsync());

        var archived = await client.GetFromJsonAsync<List<TaskResponse>>("/tasks?status=archived");
        Assert.NotNull(archived);
        Assert.Contains(archived!, task => task.Id == created.Id && task.Status == "archived");

        var active = await client.GetFromJsonAsync<List<TaskResponse>>("/tasks");
        Assert.NotNull(active);
        Assert.DoesNotContain(active!, task => task.Id == created.Id);
    }

    [Fact]
    public async Task Delete_ReturnsNotFound_WhenTaskDoesNotExist()
    {
        var response = await client.DeleteAsync($"/tasks/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);

        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.NotNull(problem);
        Assert.Equal("Task not found.", problem!.Detail);
    }

    [Fact]
    public async Task Health_ReturnsHealthyStatus()
    {
        var response = await client.GetAsync("/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payload = await response.Content.ReadFromJsonAsync<Dictionary<string, string>>();
        Assert.NotNull(payload);
        Assert.Equal("healthy", payload!["status"]);
    }

    [Fact]
    public async Task OpenApiDocument_IsExposed()
    {
        var response = await client.GetAsync("/openapi/v1.json");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task SecurityHeaders_AreApplied_ToApiResponses()
    {
        var response = await client.GetAsync("/tasks");

        Assert.Equal("nosniff", response.Headers.GetValues("X-Content-Type-Options").Single());
        Assert.Equal("DENY", response.Headers.GetValues("X-Frame-Options").Single());
        Assert.Equal("no-referrer", response.Headers.GetValues("Referrer-Policy").Single());
        Assert.Equal(
            "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
            response.Headers.GetValues("Content-Security-Policy").Single());
    }

    [Fact]
    public async Task ApiConfiguration_UsesExpectedDefaults()
    {
        var options = factory.Services.GetRequiredService<TaskBoardApiOptions>();

        Assert.NotNull(options);
        Assert.Equal("http://localhost:5173", options.FrontendOrigin);
        Assert.Equal(16, options.JsonMaxDepth);
        Assert.Equal(16 * 1024L, options.MaxRequestBodySizeBytes);
        Assert.Equal("frontend", TaskBoardApiConfiguration.FrontendCorsPolicy);
    }
}
