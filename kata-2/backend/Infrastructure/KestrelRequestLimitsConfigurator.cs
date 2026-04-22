using Microsoft.AspNetCore.Server.Kestrel.Core;

namespace TaskBoard.Api.Infrastructure;

public sealed class KestrelRequestLimitsConfigurator(TaskBoardApiOptions apiOptions)
{
    public void Apply(KestrelServerOptions options)
    {
        options.Limits.MaxRequestBodySize = apiOptions.MaxRequestBodySizeBytes;
    }
}
