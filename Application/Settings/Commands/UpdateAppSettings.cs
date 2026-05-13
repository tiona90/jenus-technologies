using Application.Core;
using Application.Settings.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Persistence;

namespace Application.Settings.Commands;

public class UpdateAppSettings
{
    public class Command : IRequest<Result<AppSettingsDto>>
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

    public class Handler(AppDbContext context) : IRequestHandler<Command, Result<AppSettingsDto>>
    {
        public async Task<Result<AppSettingsDto>> Handle(Command request, CancellationToken cancellationToken)
        {
            if (request.LeaveYearStartMonth < 1 || request.LeaveYearStartMonth > 12)
                return Result<AppSettingsDto>.Failure("Leave year start month must be between 1 and 12.");
            if (request.MaxCarryoverDays < 0)
                return Result<AppSettingsDto>.Failure("Max carryover days cannot be negative.");
            if (request.DefaultAnnualEntitlement < 1)
                return Result<AppSettingsDto>.Failure("Default annual entitlement must be at least 1.");

            var settings = await context.AppSettings.FirstOrDefaultAsync(cancellationToken);
            if (settings is null)
            {
                settings = new Domain.AppSettings();
                context.AppSettings.Add(settings);
            }

            settings.LeaveYearStartMonth = request.LeaveYearStartMonth;
            settings.MaxCarryoverDays = request.MaxCarryoverDays;
            settings.DefaultAnnualEntitlement = request.DefaultAnnualEntitlement;
            settings.YearEndWarningDays = request.YearEndWarningDays;
            settings.FinalWarningDays = request.FinalWarningDays;
            settings.AutoRunRollover = request.AutoRunRollover;
            settings.SendYearEndWarningEmails = request.SendYearEndWarningEmails;
            settings.BlockLeaveSpanningIntoNextYear = request.BlockLeaveSpanningIntoNextYear;
            settings.NotifyManagersOfTeamExpiries = request.NotifyManagersOfTeamExpiries;

            var newCode = request.HolidayCountryCode?.Trim().ToUpperInvariant();
            var countryChanged = !string.Equals(settings.HolidayCountryCode, newCode, StringComparison.OrdinalIgnoreCase);
            settings.HolidayCountryCode = string.IsNullOrEmpty(newCode) ? null : newCode;
            settings.HolidayCountryName = string.IsNullOrWhiteSpace(request.HolidayCountryName) ? null : request.HolidayCountryName.Trim();

            // Country changed → invalidate cached holidays from the previous country.
            if (countryChanged)
            {
                var stale = await context.PublicHolidays.ToListAsync(cancellationToken);
                if (stale.Count > 0) context.PublicHolidays.RemoveRange(stale);
            }

            await context.SaveChangesAsync(cancellationToken);

            return Result<AppSettingsDto>.Success(new AppSettingsDto
            {
                LeaveYearStartMonth = settings.LeaveYearStartMonth,
                MaxCarryoverDays = settings.MaxCarryoverDays,
                DefaultAnnualEntitlement = settings.DefaultAnnualEntitlement,
                YearEndWarningDays = settings.YearEndWarningDays,
                FinalWarningDays = settings.FinalWarningDays,
                AutoRunRollover = settings.AutoRunRollover,
                SendYearEndWarningEmails = settings.SendYearEndWarningEmails,
                BlockLeaveSpanningIntoNextYear = settings.BlockLeaveSpanningIntoNextYear,
                NotifyManagersOfTeamExpiries = settings.NotifyManagersOfTeamExpiries,
                HolidayCountryCode = settings.HolidayCountryCode,
                HolidayCountryName = settings.HolidayCountryName,
            });
        }
    }
}
