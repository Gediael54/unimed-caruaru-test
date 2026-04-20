using TaskBoard.Api.Dtos;
using TaskBoard.Api.Repositories;
using TaskBoard.Api.Services;

var tests = new List<(string Name, Action Test)>
{
    ("create trims title and defaults to pending", CreateTrimsTitleAndDefaultsToPending),
    ("create rejects blank title", CreateRejectsBlankTitle),
    ("list rejects invalid status", ListRejectsInvalidStatus),
    ("update validates status and title", UpdateValidatesStatusAndTitle),
    ("delete removes existing task", DeleteRemovesExistingTask),
};

var failures = 0;
foreach (var (name, test) in tests)
{
    try
    {
        test();
        Console.WriteLine($"PASS {name}");
    }
    catch (Exception exception)
    {
        failures++;
        Console.Error.WriteLine($"FAIL {name}: {exception.Message}");
    }
}

return failures == 0 ? 0 : 1;

static TaskService NewService()
{
    return new TaskService(new InMemoryTaskRepository());
}

static void CreateTrimsTitleAndDefaultsToPending()
{
    var service = NewService();

    var result = service.Create(new CreateTaskRequest("  Call patient  "));

    AssertTrue(result.IsSuccess, "Expected create to succeed.");
    AssertEqual("Call patient", result.Value!.Title, "Expected title to be trimmed.");
    AssertEqual("pending", result.Value.Status, "Expected pending status.");
}

static void CreateRejectsBlankTitle()
{
    var service = NewService();

    var result = service.Create(new CreateTaskRequest("   "));

    AssertEqual(ServiceErrorType.Validation, result.ErrorType, "Expected validation error.");
}

static void ListRejectsInvalidStatus()
{
    var service = NewService();

    var result = service.List("archived");

    AssertEqual(ServiceErrorType.Validation, result.ErrorType, "Expected validation error.");
}

static void UpdateValidatesStatusAndTitle()
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
}

static void DeleteRemovesExistingTask()
{
    var service = NewService();
    var created = service.Create(new CreateTaskRequest("Delete this")).Value!;

    var deleteResult = service.Delete(created.Id);
    var getResult = service.Get(created.Id);

    AssertTrue(deleteResult.IsSuccess, "Expected delete to succeed.");
    AssertEqual(ServiceErrorType.NotFound, getResult.ErrorType, "Expected task to be gone.");
}

static void AssertTrue(bool condition, string message)
{
    if (!condition)
    {
        throw new InvalidOperationException(message);
    }
}

static void AssertEqual<T>(T expected, T actual, string message)
{
    if (!EqualityComparer<T>.Default.Equals(expected, actual))
    {
        throw new InvalidOperationException($"{message} Expected {expected}, got {actual}.");
    }
}
