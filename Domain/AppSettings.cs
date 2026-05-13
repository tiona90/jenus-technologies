namespace Domain;

public class AppSettings
{
    public int Id { get; set; }

    public int LeaveYearStartMonth { get; set; } = 1;
    public int MaxCarryoverDays { get; set; } = 5;
    public int DefaultAnnualEntitlement { get; set; } = 20;
    public int YearEndWarningDays { get; set; } = 30;
    public int FinalWarningDays { get; set; } = 7;
    public bool AutoRunRollover { get; set; } = true;
    public bool SendYearEndWarningEmails { get; set; } = true;
    public bool BlockLeaveSpanningIntoNextYear { get; set; } = true;
    public bool NotifyManagersOfTeamExpiries { get; set; } = true;

    public string? HolidayCountryCode { get; set; }
    public string? HolidayCountryName { get; set; }
}
