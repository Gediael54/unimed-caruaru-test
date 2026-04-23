using TaskBoard.Api.Models;

namespace TaskBoard.Api.Repositories;

public interface ITaskRepository
{
    IReadOnlyList<BoardTask> List(string? status);

    BoardTask? Get(Guid id);

    BoardTask Add(BoardTask task);

    BoardTask? Update(BoardTask task);

    BoardTask? Update(Guid id, Func<BoardTask, BoardTask> update);

    bool Delete(Guid id);
}
