namespace Infrastructure.Configuration;

public class SlackOptions
{
    public const string SectionName = "Slack";

    // Incoming-webhook URL (https://hooks.slack.com/services/...). Leave empty
    // to disable Slack notifications; the service will short-circuit cleanly.
    public string WebhookUrl { get; set; } = string.Empty;
}
