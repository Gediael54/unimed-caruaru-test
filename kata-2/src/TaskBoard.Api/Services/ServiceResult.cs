namespace TaskBoard.Api.Services;

public sealed record ServiceResult<T>(
    T? Value,
    ServiceErrorType ErrorType = ServiceErrorType.None,
    string? ErrorMessage = null)
{
    public bool IsSuccess => ErrorType == ServiceErrorType.None;

    public static ServiceResult<T> Success(T value)
    {
        return new ServiceResult<T>(value);
    }

    public static ServiceResult<T> Validation(string message)
    {
        return new ServiceResult<T>(default, ServiceErrorType.Validation, message);
    }

    public static ServiceResult<T> NotFound(string message)
    {
        return new ServiceResult<T>(default, ServiceErrorType.NotFound, message);
    }
}
