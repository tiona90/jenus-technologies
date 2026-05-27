namespace Domain.Interfaces;

// Generic chat-channel notifier. The Slack and Teams webhook payload formats
// both accept a flat `{"text": "..."}` shape, so one method covers both.
// Implementations must be fire-and-forget safe: never throw, log on failure
// and return — a flaky webhook must not break the user-facing flow that
// triggered the notification (e.g. leave approval).
public interface IChatNotificationService
{
    Task SendMessageAsync(string text, CancellationToken cancellationToken = default);
}
