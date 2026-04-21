namespace TaskBoard.Api.Models;

public static class TaskStatuses
{
    public const string Pending = "pending";
    public const string Completed = "completed";

    public static bool IsValid(string status)
    {
        return status is Pending or Completed;
    }
}
