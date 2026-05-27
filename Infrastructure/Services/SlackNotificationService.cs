using System.Net.Http.Json;
using Domain.Interfaces;
using Infrastructure.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Infrastructure.Services;

public class SlackNotificationService : IChatNotificationService
{
    private readonly HttpClient _http;
    private readonly IOptionsMonitor<SlackOptions> _options;
    private readonly ILogger<SlackNotificationService> _logger;

    public SlackNotificationService(
        HttpClient http,
        IOptionsMonitor<SlackOptions> options,
        ILogger<SlackNotificationService> logger)
    {
        _http = http;
        _options = options;
        _logger = logger;
    }

    public async Task SendMessageAsync(string text, CancellationToken cancellationToken = default)
    {
        var webhookUrl = _options.CurrentValue.WebhookUrl;
        if (string.IsNullOrWhiteSpace(webhookUrl))
        {
            // Webhook not configured — the expected state in environments where
            // Slack isn't wired up. Debug-level so it doesn't spam logs in dev.
            _logger.LogDebug("Slack webhook URL is not configured; skipping notification.");
            return;
        }

        try
        {
            var response = await _http.PostAsJsonAsync(webhookUrl, new { text }, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "Slack webhook returned {StatusCode} for message: {Message}",
                    (int)response.StatusCode, text);
            }
        }
        catch (Exception ex)
        {
            // Never throw from a notification path — see interface comment.
            _logger.LogWarning(ex, "Failed to deliver Slack notification: {Message}", text);
        }
    }
}
