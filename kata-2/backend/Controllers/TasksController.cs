using Microsoft.AspNetCore.Mvc;
using TaskBoard.Api.Dtos;
using TaskBoard.Api.Services;

namespace TaskBoard.Api.Controllers;

[ApiController]
[Route("tasks")]
public sealed class TasksController(TaskService taskService) : ControllerBase
{
    [HttpGet]
    public ActionResult<IReadOnlyList<TaskResponse>> List([FromQuery] string? status)
    {
        var result = taskService.List(status);

        if (!result.IsSuccess)
        {
            return BadRequest(new { error = result.ErrorMessage });
        }

        return Ok(result.Value);
    }

    [HttpGet("{id:guid}")]
    public ActionResult<TaskResponse> GetById(Guid id)
    {
        var result = taskService.Get(id);

        if (result.ErrorType == ServiceErrorType.NotFound)
        {
            return NotFound(new { error = result.ErrorMessage });
        }

        return Ok(result.Value);
    }

    [HttpPost]
    public ActionResult<TaskResponse> Create([FromBody] CreateTaskRequest? request)
    {
        if (request is null)
        {
            return BadRequest(new { error = "Request body is required." });
        }

        var result = taskService.Create(request);

        if (!result.IsSuccess)
        {
            return BadRequest(new { error = result.ErrorMessage });
        }

        return CreatedAtAction(nameof(GetById), new { id = result.Value!.Id }, result.Value);
    }

    [HttpPatch("{id:guid}")]
    public ActionResult<TaskResponse> Update(Guid id, [FromBody] UpdateTaskRequest? request)
    {
        if (request is null)
        {
            return BadRequest(new { error = "Request body is required." });
        }

        var result = taskService.Update(id, request);

        return result.ErrorType switch
        {
            ServiceErrorType.None => Ok(result.Value),
            ServiceErrorType.NotFound => NotFound(new { error = result.ErrorMessage }),
            _ => BadRequest(new { error = result.ErrorMessage }),
        };
    }

    [HttpDelete("{id:guid}")]
    public IActionResult Delete(Guid id)
    {
        var result = taskService.Delete(id);

        if (result.ErrorType == ServiceErrorType.NotFound)
        {
            return NotFound(new { error = result.ErrorMessage });
        }

        return NoContent();
    }
}
