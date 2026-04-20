using TaskBoard.Api.Models;

namespace TaskBoard.Api.Repositories;

public sealed class InMemoryTaskRepository : ITaskRepository
{
    private readonly object syncRoot = new();
    private readonly Dictionary<Guid, BoardTask> tasks = new();

    public IReadOnlyList<BoardTask> List(string? status)
    {
        lock (syncRoot)
        {
            return tasks.Values
                .Where(task => status is null || task.Status == status)
                .OrderBy(task => task.CreatedAt)
                .ThenBy(task => task.Id)
                .ToList();
        }
    }

    public BoardTask? Get(Guid id)
    {
        lock (syncRoot)
        {
            return tasks.GetValueOrDefault(id);
        }
    }

    public BoardTask Add(BoardTask task)
    {
        lock (syncRoot)
        {
            tasks[task.Id] = task;
            return task;
        }
    }

    public BoardTask? Update(BoardTask task)
    {
        lock (syncRoot)
        {
            if (!tasks.ContainsKey(task.Id))
            {
                return null;
            }

            tasks[task.Id] = task;
            return task;
        }
    }

    public bool Delete(Guid id)
    {
        lock (syncRoot)
        {
            return tasks.Remove(id);
        }
    }
}
