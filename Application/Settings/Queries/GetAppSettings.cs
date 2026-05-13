using Application.Settings.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Persistence;

namespace Application.Settings.Queries;

public class GetAppSettings
{
    public class Query : IRequest<AppSettingsDto> { }

    public class Handler(AppDbContext context) : IRequestHandler<Query, AppSettingsDto>
    {
        public async Task<AppSettingsDto> Handle(Query request, CancellationToken cancellationToken)
        {
            var s = await context.AppSettings.FirstOrDefaultAsync(cancellationToken);
            return new AppSettingsDto
            {
                LeaveYearStartMonth = s?.LeaveYearStartMonth ?? 1,
                MaxCarryoverDays = s?.MaxCarryoverDays ?? 5,
                DefaultAnnualEntitlement = s?.DefaultAnnualEntitlement ?? 20,
                YearEndWarningDays = s?.YearEndWarningDays ?? 30,
                FinalWarningDays = s?.FinalWarningDays ?? 7,
                AutoRunRollover = s?.AutoRunRollover ?? true,
                SendYearEndWarningEmails = s?.SendYearEndWarningEmails ?? true,
                BlockLeaveSpanningIntoNextYear = s?.BlockLeaveSpanningIntoNextYear ?? true,
                NotifyManagersOfTeamExpiries = s?.NotifyManagersOfTeamExpiries ?? true,
                HolidayCountryCode = s?.HolidayCountryCode,
                HolidayCountryName = s?.HolidayCountryName,
            };
        }
    }
}
