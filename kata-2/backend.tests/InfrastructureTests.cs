using Microsoft.AspNetCore.Server.Kestrel.Core;
using TaskBoard.Api.Infrastructure;

namespace TaskBoard.Api.Tests;

[Trait("Scope", "Api")]
public sealed class InfrastructureTests
{
    [Fact]
    public void KestrelRequestLimitsConfigurator_AppliesConfiguredLimit()
    {
        var configurator = new KestrelRequestLimitsConfigurator(
            new TaskBoardApiOptions { MaxRequestBodySizeBytes = 32 * 1024 });
        var options = new KestrelServerOptions();

        configurator.Apply(options);

        Assert.Equal(32 * 1024L, options.Limits.MaxRequestBodySize);
    }
}
