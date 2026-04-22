namespace TaskBoard.Api.Models;

public static class TaskPriorities
{
    public const string Low = "low";
    public const string Medium = "medium";
    public const string High = "high";

    public static bool IsValid(string priority)
    {
        return priority is Low or Medium or High;
    }
}
