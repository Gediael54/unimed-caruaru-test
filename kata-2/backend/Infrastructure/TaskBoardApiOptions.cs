namespace TaskBoard.Api.Infrastructure;

public sealed class TaskBoardApiOptions
{
    public const string SectionName = "TaskBoardApi";

    public string FrontendOrigin { get; init; } = "http://localhost:5173";
    public int JsonMaxDepth { get; init; } = 16;
    public long MaxRequestBodySizeBytes { get; init; } = 16 * 1024;
}
