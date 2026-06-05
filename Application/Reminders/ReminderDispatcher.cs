using System.Net;
using Domain;
using Domain.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Persistence;

namespace Application.Reminders;

// Builds and sends the content for a single reminder type. Pure dispatch — the
// scheduling (which reminders are due, dedup) lives in the API hosted service
// (ReminderBackgroundService); this class only knows how to produce one
// reminder's recipients + message when asked.
//
// Currently implements the three reminders backed by real data:
//   • pending-approvals — managers/admins with leave/timesheets awaiting review
//   • late-submissions  — employees sitting on an un-submitted (Draft) timesheet
//   • low-balance       — employees whose remaining leave is below the threshold
// Other ids are accepted but logged as not-implemented rather than failing.
public class ReminderDispatcher(
    AppDbContext context,
    IEmailService emailService,
    IChatNotificationService chat,
    ILogger<ReminderDispatcher> logger)
{
    // Matches the client copy ("fewer than 5 days remaining").
    private const int LowBalanceThreshold = 5;

    // How far ahead the birthday reminder looks (inclusive of today).
    private const int BirthdayLookaheadDays = 7;

    public const string PendingApprovals = "pending-approvals";
    public const string LateSubmissions = "late-submissions";
    public const string LowBalance = "low-balance";
    public const string BirthdayReminder = "birthday-reminder";

    // Convenience overload (used by the on-demand test endpoint): loads settings.
    public async Task DispatchAsync(string reminderId, CancellationToken cancellationToken)
    {
        var settings = await context.AppSettings.AsNoTracking().FirstOrDefaultAsync(cancellationToken)
                       ?? new AppSettings();
        await DispatchAsync(reminderId, settings, cancellationToken);
    }

    public async Task DispatchAsync(string reminderId, AppSettings settings, CancellationToken cancellationToken)
    {
        switch (reminderId)
        {
            case PendingApprovals:
                await PendingApprovalsAsync(settings, cancellationToken);
                break;
            case LateSubmissions:
                await LateSubmissionsAsync(settings, cancellationToken);
                break;
            case LowBalance:
                await LowBalanceAsync(settings, cancellationToken);
                break;
            case BirthdayReminder:
                await BirthdayRemindersAsync(settings, cancellationToken);
                break;
            default:
                logger.LogInformation("Reminder '{Id}' has no dispatcher implementation; skipping.", reminderId);
                break;
        }
    }

    // ── pending-approvals ────────────────────────────────────────────────────
    private async Task PendingApprovalsAsync(AppSettings settings, CancellationToken ct)
    {
        var pendingLeave = await context.AnnualLeaves
            .Where(l => l.Status == AnnualLeaveStatus.Pending)
            .Select(l => l.DepartmentId)
            .ToListAsync(ct);

        var pendingTimesheets = await context.Timesheets
            .Where(t => t.Status == TimesheetStatus.Submitted || t.Status == TimesheetStatus.Resubmitted)
            .Select(t => (int?)t.DepartmentId)
            .ToListAsync(ct);

        var totalLeave = pendingLeave.Count;
        var totalTimesheets = pendingTimesheets.Count;

        if (totalLeave == 0 && totalTimesheets == 0)
        {
            logger.LogInformation("pending-approvals: nothing awaiting review; no notifications sent.");
            return;
        }

        var admins = await GetUsersInRoleAsync(AppRoles.Admin, ct);
        var managers = await GetManagersWithDepartmentAsync(ct);

        var sent = 0;
        if (settings.EmailNotificationsEnabled)
        {
            // Admins see the whole organisation.
            foreach (var admin in admins)
            {
                if (await SendPendingSummaryAsync(admin.Email, admin.DisplayName, totalLeave, totalTimesheets, "the organisation", ct))
                    sent++;
            }

            // Managers see only their own department's queue.
            foreach (var mgr in managers)
            {
                if (admins.Any(a => a.UserId == mgr.UserId)) continue; // don't double-email admin-managers
                var deptLeave = pendingLeave.Count(d => d == mgr.DepartmentId);
                var deptTimesheets = pendingTimesheets.Count(d => d == mgr.DepartmentId);
                if (deptLeave == 0 && deptTimesheets == 0) continue;
                if (await SendPendingSummaryAsync(mgr.Email, mgr.DisplayName, deptLeave, deptTimesheets, "your department", ct))
                    sent++;
            }
        }
        else
        {
            logger.LogInformation("pending-approvals: email notifications disabled; skipping emails.");
        }

        await MaybeSlackAsync(settings,
            $"⏳ Pending approvals: {totalLeave} leave request(s) and {totalTimesheets} timesheet(s) awaiting review.", ct);

        logger.LogInformation("pending-approvals: dispatched. Emails sent: {Sent}.", sent);
    }

    private Task<bool> SendPendingSummaryAsync(string email, string? name, int leaveCount, int timesheetCount, string scope, CancellationToken ct)
    {
        var greeting = WebUtility.HtmlEncode(name ?? email);
        var html = $"""
<p>Hello {greeting},</p>
<p>You have items awaiting your review across {WebUtility.HtmlEncode(scope)}:</p>
<ul>
  <li><strong>{leaveCount}</strong> leave request(s) pending approval</li>
  <li><strong>{timesheetCount}</strong> timesheet(s) submitted for review</li>
</ul>
<p>Please log in to WorkTrack to review and action them.</p>
""";
        var text = $"Hello {name ?? email},\n\nAwaiting your review across {scope}:\n- {leaveCount} leave request(s) pending approval\n- {timesheetCount} timesheet(s) submitted for review\n\nPlease log in to WorkTrack to review them.";
        return SendEmailAsync(email, "WorkTrack: items awaiting your approval", html, text, ct);
    }

    // ── late-submissions ─────────────────────────────────────────────────────
    private async Task LateSubmissionsAsync(AppSettings settings, CancellationToken ct)
    {
        var drafts = await context.Timesheets
            .Where(t => t.Status == TimesheetStatus.Draft && t.Employee != null && t.Employee.User != null
                        && t.Employee.User.Email != null && t.Employee.User.Email != "")
            .Select(t => new
            {
                Email = t.Employee!.User!.Email!,
                Name = t.Employee.User.DisplayName,
                t.PeriodStart,
                t.PeriodEnd,
            })
            .ToListAsync(ct);

        if (drafts.Count == 0)
        {
            logger.LogInformation("late-submissions: no draft timesheets; no notifications sent.");
            return;
        }

        var byEmployee = drafts
            .GroupBy(d => d.Email)
            .Select(g => new { Email = g.Key, g.First().Name, Periods = g.Select(x => $"{x.PeriodStart:dd MMM yyyy} – {x.PeriodEnd:dd MMM yyyy}").ToList() })
            .ToList();

        var sent = 0;
        if (settings.EmailNotificationsEnabled)
        {
            foreach (var emp in byEmployee)
            {
                var greeting = WebUtility.HtmlEncode(emp.Name ?? emp.Email);
                var items = string.Join("", emp.Periods.Select(p => $"<li>{WebUtility.HtmlEncode(p)}</li>"));
                var html = $"""
<p>Hello {greeting},</p>
<p>The following timesheet(s) are still in <strong>draft</strong> and have not been submitted:</p>
<ul>{items}</ul>
<p>Please log in to WorkTrack and submit them for approval.</p>
""";
                var text = $"Hello {emp.Name ?? emp.Email},\n\nThese timesheet(s) are still in draft and not submitted:\n{string.Join("\n", emp.Periods.Select(p => "- " + p))}\n\nPlease log in to WorkTrack and submit them.";
                if (await SendEmailAsync(emp.Email, "WorkTrack: timesheet not yet submitted", html, text, ct))
                    sent++;
            }
        }
        else
        {
            logger.LogInformation("late-submissions: email notifications disabled; skipping emails.");
        }

        await MaybeSlackAsync(settings,
            $"📋 Late submissions: {byEmployee.Count} employee(s) have an un-submitted (draft) timesheet.", ct);

        logger.LogInformation("late-submissions: dispatched. Emails sent: {Sent}.", sent);
    }

    // ── low-balance ──────────────────────────────────────────────────────────
    private async Task LowBalanceAsync(AppSettings settings, CancellationToken ct)
    {
        var low = await context.EmployeeProfiles
            .Where(p => p.AnnualLeaveEntitlement > 0 && p.LeaveBalance < LowBalanceThreshold
                        && p.User != null && p.User.Email != null && p.User.Email != "")
            .Select(p => new { Email = p.User!.Email!, Name = p.User.DisplayName, p.LeaveBalance })
            .ToListAsync(ct);

        if (low.Count == 0)
        {
            logger.LogInformation("low-balance: no employees below {Threshold} days; no notifications sent.", LowBalanceThreshold);
            return;
        }

        var sent = 0;
        if (settings.EmailNotificationsEnabled)
        {
            foreach (var emp in low)
            {
                var greeting = WebUtility.HtmlEncode(emp.Name ?? emp.Email);
                var html = $"""
<p>Hello {greeting},</p>
<p>Your remaining annual leave balance is <strong>{emp.LeaveBalance} day(s)</strong>, which is below {LowBalanceThreshold} days.</p>
<p>Plan any remaining time off soon, or speak to your manager if you have questions.</p>
""";
                var text = $"Hello {emp.Name ?? emp.Email},\n\nYour remaining annual leave balance is {emp.LeaveBalance} day(s), below {LowBalanceThreshold} days. Plan any remaining time off soon.";
                if (await SendEmailAsync(emp.Email, "WorkTrack: your leave balance is running low", html, text, ct))
                    sent++;
            }
        }
        else
        {
            logger.LogInformation("low-balance: email notifications disabled; skipping emails.");
        }

        await MaybeSlackAsync(settings,
            $"🔔 Low balance: {low.Count} employee(s) have fewer than {LowBalanceThreshold} leave days remaining.", ct);

        logger.LogInformation("low-balance: dispatched. Emails sent: {Sent}.", sent);
    }

    // ── birthday-reminder ────────────────────────────────────────────────────
    // Notifies admins (whole org) and managers (their department) of employees
    // whose birthday falls within the next BirthdayLookaheadDays.
    private async Task BirthdayRemindersAsync(AppSettings settings, CancellationToken ct)
    {
        var people = await context.EmployeeProfiles
            .Where(p => p.User != null && p.User.DateOfBirth != null)
            .Select(p => new { Name = p.User!.DisplayName, Dob = p.User.DateOfBirth!.Value, p.DepartmentId })
            .ToListAsync(ct);

        var today = DateOnly.FromDateTime(DateTime.Now);

        var upcoming = people
            .Select(p => new
            {
                p.Name,
                p.DepartmentId,
                Date = NextBirthday(p.Dob, today),
                TurningAge = NextBirthday(p.Dob, today).Year - p.Dob.Year,
            })
            .Where(p => p.Date <= today.AddDays(BirthdayLookaheadDays - 1))
            .OrderBy(p => p.Date)
            .ToList();

        if (upcoming.Count == 0)
        {
            logger.LogInformation("birthday-reminder: no birthdays in the next {Days} days; nothing sent.", BirthdayLookaheadDays);
            return;
        }

        var admins = await GetUsersInRoleAsync(AppRoles.Admin, ct);
        var managers = await GetManagersWithDepartmentAsync(ct);

        string LineHtml(string name, DateOnly date, int age) =>
            $"<li><strong>{WebUtility.HtmlEncode(name)}</strong> — {date:dd MMM} (turns {age})</li>";
        string LineText(string name, DateOnly date, int age) =>
            $"- {name} — {date:dd MMM} (turns {age})";

        var sent = 0;
        if (settings.EmailNotificationsEnabled)
        {
            foreach (var admin in admins)
            {
                var html = $"<p>Hello {WebUtility.HtmlEncode(admin.DisplayName ?? admin.Email)},</p><p>Upcoming birthdays in the next {BirthdayLookaheadDays} days:</p><ul>{string.Join("", upcoming.Select(u => LineHtml(u.Name, u.Date, u.TurningAge)))}</ul>";
                var text = $"Hello {admin.DisplayName ?? admin.Email},\n\nUpcoming birthdays in the next {BirthdayLookaheadDays} days:\n{string.Join("\n", upcoming.Select(u => LineText(u.Name, u.Date, u.TurningAge)))}";
                if (await SendEmailAsync(admin.Email, "WorkTrack: upcoming birthdays 🎂", html, text, ct)) sent++;
            }

            foreach (var mgr in managers)
            {
                if (admins.Any(a => a.UserId == mgr.UserId)) continue;
                var deptUpcoming = upcoming.Where(u => u.DepartmentId == mgr.DepartmentId).ToList();
                if (deptUpcoming.Count == 0) continue;
                var html = $"<p>Hello {WebUtility.HtmlEncode(mgr.DisplayName ?? mgr.Email)},</p><p>Upcoming birthdays in your department:</p><ul>{string.Join("", deptUpcoming.Select(u => LineHtml(u.Name, u.Date, u.TurningAge)))}</ul>";
                var text = $"Hello {mgr.DisplayName ?? mgr.Email},\n\nUpcoming birthdays in your department:\n{string.Join("\n", deptUpcoming.Select(u => LineText(u.Name, u.Date, u.TurningAge)))}";
                if (await SendEmailAsync(mgr.Email, "WorkTrack: upcoming birthdays 🎂", html, text, ct)) sent++;
            }
        }
        else
        {
            logger.LogInformation("birthday-reminder: email notifications disabled; skipping emails.");
        }

        await MaybeSlackAsync(settings,
            $"🎂 Upcoming birthdays ({BirthdayLookaheadDays} days): {string.Join(", ", upcoming.Select(u => $"{u.Name} ({u.Date:dd MMM})"))}.", ct);

        logger.LogInformation("birthday-reminder: dispatched. Emails sent: {Sent}.", sent);
    }

    // Next occurrence of a birthday on/after 'from', clamping Feb 29 to Feb 28 in
    // non-leap years.
    private static DateOnly NextBirthday(DateOnly dob, DateOnly from)
    {
        var candidate = ClampToMonth(from.Year, dob.Month, dob.Day);
        if (candidate < from) candidate = ClampToMonth(from.Year + 1, dob.Month, dob.Day);
        return candidate;
    }

    private static DateOnly ClampToMonth(int year, int month, int day) =>
        new(year, month, Math.Min(day, DateTime.DaysInMonth(year, month)));

    // ── shared helpers ───────────────────────────────────────────────────────
    private async Task<bool> SendEmailAsync(string email, string subject, string html, string text, CancellationToken ct)
    {
        try
        {
            return await emailService.SendEmailAsync(email, subject, html, text, ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Reminder email to {Email} failed.", email);
            return false;
        }
    }

    private async Task MaybeSlackAsync(AppSettings settings, string message, CancellationToken ct)
    {
        if (!settings.SlackEnabled) return;
        // SlackNotificationService is fire-and-forget safe (no-ops without a webhook).
        await chat.SendMessageAsync(message, ct);
    }

    private record UserContact(string UserId, string Email, string? DisplayName);
    private record ManagerContact(string UserId, string Email, string? DisplayName, int DepartmentId);

    private async Task<List<UserContact>> GetUsersInRoleAsync(string roleName, CancellationToken ct)
    {
        var roleId = await context.Roles.Where(r => r.Name == roleName).Select(r => r.Id).FirstOrDefaultAsync(ct);
        if (roleId is null) return [];

        return await (
            from ur in context.UserRoles
            where ur.RoleId == roleId
            join u in context.Users on ur.UserId equals u.Id
            where u.Email != null && u.Email != ""
            select new UserContact(u.Id, u.Email!, u.DisplayName)
        ).Distinct().ToListAsync(ct);
    }

    private async Task<List<ManagerContact>> GetManagersWithDepartmentAsync(CancellationToken ct)
    {
        var roleId = await context.Roles.Where(r => r.Name == AppRoles.Manager).Select(r => r.Id).FirstOrDefaultAsync(ct);
        if (roleId is null) return [];

        return await (
            from ep in context.EmployeeProfiles
            join ur in context.UserRoles on ep.UserId equals ur.UserId
            where ur.RoleId == roleId
            join u in context.Users on ep.UserId equals u.Id
            where u.Email != null && u.Email != ""
            select new ManagerContact(u.Id, u.Email!, u.DisplayName, ep.DepartmentId)
        ).Distinct().ToListAsync(ct);
    }
}
