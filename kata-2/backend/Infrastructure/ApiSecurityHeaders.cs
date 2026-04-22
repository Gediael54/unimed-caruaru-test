using Microsoft.AspNetCore.Http;

namespace TaskBoard.Api.Infrastructure;

public static class ApiSecurityHeaders
{
    private static readonly KeyValuePair<string, string>[] DefaultHeaders =
    [
        new("X-Content-Type-Options", "nosniff"),
        new("X-Frame-Options", "DENY"),
        new("Referrer-Policy", "no-referrer"),
        new("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"),
    ];

    public static void Apply(IHeaderDictionary headers)
    {
        foreach (var header in DefaultHeaders)
        {
            headers.TryAdd(header.Key, header.Value);
        }
    }
}
