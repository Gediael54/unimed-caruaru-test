using System.Text.Json;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using TaskBoard.Api.Repositories;
using TaskBoard.Api.Services;

namespace TaskBoard.Api.Infrastructure;

public static class TaskBoardApiConfiguration
{
    public const string FrontendCorsPolicy = "frontend";

    public static IServiceCollection AddTaskBoardApiServices(
        this IServiceCollection services,
        TaskBoardApiOptions apiOptions)
    {
        services.AddProblemDetails();
        services.AddHealthChecks();
        services.AddOpenApi();

        services
            .AddControllers()
            .AddJsonOptions(jsonOptions =>
            {
                jsonOptions.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
                jsonOptions.JsonSerializerOptions.MaxDepth = apiOptions.JsonMaxDepth;
            });

        services.AddCors(corsOptions =>
        {
            corsOptions.AddPolicy(
                FrontendCorsPolicy,
                policy =>
                {
                    policy
                        .WithOrigins(apiOptions.FrontendOrigin)
                        .AllowAnyHeader()
                        .AllowAnyMethod();
                });
        });

        services.AddSingleton(apiOptions);
        services.AddSingleton<ITaskRepository, InMemoryTaskRepository>();
        services.AddSingleton<TaskService>();

        return services;
    }

    public static WebApplication UseTaskBoardApi(this WebApplication app)
    {
        app.UseExceptionHandler();

        app.Use(async (context, next) =>
        {
            ApiSecurityHeaders.Apply(context.Response.Headers);
            await next();
        });

        app.UseCors(FrontendCorsPolicy);
        app.MapOpenApi();
        app.MapHealthChecks(
            "/health",
            new HealthCheckOptions
            {
                ResponseWriter = async (context, report) =>
                {
                    context.Response.ContentType = "application/json";
                    await context.Response.WriteAsJsonAsync(new
                    {
                        status = report.Status.ToString().ToLowerInvariant(),
                    });
                },
            });
        app.MapControllers();

        return app;
    }
}
