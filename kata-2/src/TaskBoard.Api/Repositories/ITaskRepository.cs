using TaskBoard.Api.Models;

namespace TaskBoard.Api.Repositories;

public interface ITaskRepository
{
    IReadOnlyList<BoardTask> List(string? status);

    BoardTask? Get(Guid id);

    BoardTask Add(BoardTask task);

    BoardTask? Update(BoardTask task);

    bool Delete(Guid id);
}
