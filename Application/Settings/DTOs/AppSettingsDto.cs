namespace Application.Settings.DTOs;

public class AppSettingsDto
{
    public int LeaveYearStartMonth { get; set; }
    public int MaxCarryoverDays { get; set; }
    public int DefaultAnnualEntitlement { get; set; }
    public int YearEndWarningDays { get; set; }
    public int FinalWarningDays { get; set; }
    public bool AutoRunRollover { get; set; }
    public bool SendYearEndWarningEmails { get; set; }
    public bool BlockLeaveSpanningIntoNextYear { get; set; }
    public bool NotifyManagersOfTeamExpiries { get; set; }
    public string? HolidayCountryCode { get; set; }
    public string? HolidayCountryName { get; set; }
}
