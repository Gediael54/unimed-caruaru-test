using Microsoft.AspNetCore.Mvc;
using TaskBoard.Api.Dtos;
using TaskBoard.Api.Services;

namespace TaskBoard.Api.Controllers;

[ApiController]
[Route("tasks")]
public sealed class TasksController(TaskService taskService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<TaskResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public ActionResult<IReadOnlyList<TaskResponse>> List([FromQuery] string? status)
    {
        var result = taskService.List(status);

        if (!result.IsSuccess)
        {
            return ToProblem(result);
        }

        return Ok(result.Value);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(TaskResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public ActionResult<TaskResponse> GetById(Guid id)
    {
        var result = taskService.Get(id);

        if (result.ErrorType == ServiceErrorType.NotFound)
        {
            return ToProblem(result);
        }

        return Ok(result.Value);
    }

    [HttpPost]
    [ProducesResponseType(typeof(TaskResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public ActionResult<TaskResponse> Create([FromBody] CreateTaskRequest? request)
    {
        if (request is null)
        {
            return Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Validation error",
                detail: "Request body is required.");
        }

        var result = taskService.Create(request);

        if (!result.IsSuccess)
        {
            return ToProblem(result);
        }

        return CreatedAtAction(nameof(GetById), new { id = result.Value!.Id }, result.Value);
    }

    [HttpPatch("{id:guid}")]
    [ProducesResponseType(typeof(TaskResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public ActionResult<TaskResponse> Update(Guid id, [FromBody] UpdateTaskRequest? request)
    {
        if (request is null)
        {
            return Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Validation error",
                detail: "Request body is required.");
        }

        var result = taskService.Update(id, request);

        return result.ErrorType switch
        {
            ServiceErrorType.None => Ok(result.Value),
            _ => ToProblem(result),
        };
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public IActionResult Delete(Guid id)
    {
        var result = taskService.Delete(id);

        if (result.ErrorType == ServiceErrorType.NotFound)
        {
            return ToProblem(result);
        }

        return NoContent();
    }

    private ObjectResult ToProblem<T>(ServiceResult<T> result)
    {
        var (statusCode, title) = result.ErrorType switch
        {
            ServiceErrorType.Validation => (StatusCodes.Status400BadRequest, "Validation error"),
            ServiceErrorType.NotFound => (StatusCodes.Status404NotFound, "Resource not found"),
            _ => (StatusCodes.Status500InternalServerError, "Unexpected error"),
        };

        return Problem(
            statusCode: statusCode,
            title: title,
            detail: result.ErrorMessage);
    }
}
