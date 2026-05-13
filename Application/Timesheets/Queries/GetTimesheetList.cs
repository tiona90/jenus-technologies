using Application.Core;
using Application.Timesheets.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Persistence;

namespace Application.Timesheets.Queries
{
    public class GetTimesheetList
    {
        public class Query : IRequest<List<TimesheetDto>>
        {
            public string RequestingUserId { get; set; } = string.Empty;
            public bool IsAdmin { get; set; }
            public bool IsManager { get; set; }
        }

        public class Handler : IRequestHandler<Query, List<TimesheetDto>>
        {
            private readonly AppDbContext _context;
            public Handler(AppDbContext context) { _context = context; }

            public async Task<List<TimesheetDto>> Handle(Query request, CancellationToken cancellationToken)
            {
                IQueryable<Domain.Timesheet> query = _context.Timesheets
                    .Include(t => t.Employee).ThenInclude(e => e.User)
                    .Include(t => t.Entries).ThenInclude(e => e.Project)
                    .AsNoTracking();

                if (request.IsAdmin)
                {
                    // Admins see all timesheets — no filter
                }
                else if (request.IsManager)
                {
                    var scope = await ManagerAccessScopeResolver.ResolveAsync(
                        _context, request.RequestingUserId, cancellationToken);

                    query = query.Where(t =>
                        // Own timesheets
                        t.Employee.UserId == request.RequestingUserId
                        // Timesheets in managed departments
                        || scope.ManagedDepartmentIds.Contains(t.DepartmentId)
                        // Direct reports' timesheets
                        || scope.DirectReportUserIds.Contains(t.Employee.UserId)
                    );
                }
                else
                {
                    // Employees see only their own timesheets
                    query = query.Where(t => t.Employee.UserId == request.RequestingUserId);
                }

                var timesheets = await query.ToListAsync(cancellationToken);

                return timesheets.Select(t =>
                {
                    var weekStart = t.PeriodStart.Date;
                    var daily = new List<decimal> { 0m, 0m, 0m, 0m, 0m };
                    foreach (var entry in t.Entries)
                    {
                        var idx = (int)(entry.Date.Date - weekStart).TotalDays;
                        if (idx >= 0 && idx < 5)
                            daily[idx] += entry.HoursWorked;
                    }

                    return new TimesheetDto
                    {
                        Id = t.Id,
                        EmployeeId = t.EmployeeId,
                        EmployeeName = t.Employee != null && t.Employee.User != null
                            ? (t.Employee.User.DisplayName ?? t.Employee.User.UserName ?? t.EmployeeId)
                            : t.EmployeeId,
                        DepartmentId = t.DepartmentId,
                        PeriodStart = t.PeriodStart,
                        PeriodEnd = t.PeriodEnd,
                        TotalHours = t.TotalHours,
                        Status = t.Status.ToString(),
                        SubmittedAt = t.SubmittedAt,
                        ApprovedAt = t.ApprovedAt,
                        CreatedAt = t.CreatedAt,
                        ProjectSummaries = t.Entries
                            .Where(e => e.Project != null)
                            .GroupBy(e => new { e.ProjectId, e.Project!.Code, e.Project.Name })
                            .Select(g => new TimesheetProjectSummaryDto
                            {
                                ProjectId = g.Key.ProjectId,
                                Code = g.Key.Code,
                                Name = g.Key.Name,
                                Hours = g.Sum(x => x.HoursWorked),
                            })
                            .OrderByDescending(p => p.Hours)
                            .ToList(),
                        DailyHours = daily,
                    };
                }).ToList();
            }
        }
    }
}
