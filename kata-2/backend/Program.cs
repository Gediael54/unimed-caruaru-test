using TaskBoard.Api.Infrastructure;

var builder = WebApplication.CreateBuilder(args);
var taskBoardOptions = builder.Configuration
    .GetSection(TaskBoardApiOptions.SectionName)
    .Get<TaskBoardApiOptions>() ?? new TaskBoardApiOptions();
var kestrelConfigurator = new KestrelRequestLimitsConfigurator(taskBoardOptions);

builder.WebHost.ConfigureKestrel(kestrelConfigurator.Apply);

builder.Services.AddTaskBoardApiServices(taskBoardOptions);

var app = builder.Build();

app.UseTaskBoardApi();
app.Run();

public partial class Program;
