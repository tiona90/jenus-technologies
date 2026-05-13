using System.Security.Claims;
using Domain;
using Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Application.Timesheets.DTOs;
using Application.Timesheets.Queries;
using MediatR;
using Persistence;

namespace API.Controllers
{
    public class CreateTimesheetRequest
    {
        public DateTime PeriodStart { get; set; }
        public DateTime PeriodEnd { get; set; }
    }

    [ApiController]
    [Route("api/[controller]")]
    public class TimesheetsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IMediator _mediator;
        private readonly IEmailService _emailService;
        private readonly ILogger<TimesheetsController> _logger;

        public TimesheetsController(AppDbContext context, IMediator mediator, IEmailService emailService, ILogger<TimesheetsController> logger)
        {
            _context = context;
            _mediator = mediator;
            _emailService = emailService;
            _logger = logger;
        }

        // GET: api/timesheets
        [HttpGet]
        [Authorize]
        public async Task<ActionResult<List<TimesheetDto>>> GetTimesheets([FromQuery] bool myOnly = false)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)
                         ?? User.FindFirstValue("sub")
                         ?? User.Identity?.Name
                         ?? string.Empty;
            var isAdmin = User.IsInRole("Admin");
            var isManager = User.IsInRole("Manager");

            return await _mediator.Send(new GetTimesheetList.Query
            {
                RequestingUserId = userId,
                IsAdmin = !myOnly && isAdmin,
                IsManager = !myOnly && isManager,
            });
        }

        // GET: api/timesheets/{id}
        [HttpGet("{id}")]
        [Authorize]
        public async Task<ActionResult<Timesheet>> GetTimesheet(string id)
        {
            var timesheet = await _context.Timesheets
                .Include(t => t.Entries)
                .FirstOrDefaultAsync(t => t.Id == id);
            if (timesheet == null) return NotFound();
            return timesheet;
        }

        // POST: api/timesheets
        [HttpPost]
        [Authorize]
        public async Task<ActionResult<TimesheetDto>> CreateTimesheet(CreateTimesheetRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)
                         ?? User.FindFirstValue("sub")
                         ?? User.Identity?.Name
                         ?? string.Empty;

            var employeeProfile = await _context.EmployeeProfiles
                .FirstOrDefaultAsync(ep => ep.UserId == userId);

            if (employeeProfile == null)
                return BadRequest("No employee profile found for the current user.");

            var timesheet = new Timesheet
            {
                Id = Guid.NewGuid().ToString(),
                EmployeeId = employeeProfile.Id,
                DepartmentId = employeeProfile.DepartmentId,
                PeriodStart = request.PeriodStart,
                PeriodEnd = request.PeriodEnd,
                Status = TimesheetStatus.Draft,
                TotalHours = 0,
                CreatedAt = DateTime.UtcNow,
            };

            _context.Timesheets.Add(timesheet);
            await _context.SaveChangesAsync();

            var user = await _context.Users.FindAsync(userId);
            var dto = new TimesheetDto
            {
                Id = timesheet.Id,
                EmployeeId = timesheet.EmployeeId,
                EmployeeName = user?.DisplayName ?? user?.UserName ?? timesheet.EmployeeId,
                DepartmentId = timesheet.DepartmentId,
                PeriodStart = timesheet.PeriodStart,
                PeriodEnd = timesheet.PeriodEnd,
                TotalHours = timesheet.TotalHours,
                Status = timesheet.Status.ToString(),
                SubmittedAt = timesheet.SubmittedAt,
                ApprovedAt = timesheet.ApprovedAt,
                CreatedAt = timesheet.CreatedAt,
            };

            return CreatedAtAction(nameof(GetTimesheet), new { id = timesheet.Id }, dto);
        }

        // DELETE: api/timesheets/{id}
        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteTimesheet(string id)
        {
            var timesheet = await _context.Timesheets
                .Include(t => t.Entries)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (timesheet == null) return NotFound();

            if (timesheet.Status != TimesheetStatus.Draft)
                return BadRequest("Only Draft timesheets can be deleted.");

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)
                         ?? User.FindFirstValue("sub")
                         ?? User.Identity?.Name
                         ?? string.Empty;

            var employeeProfile = await _context.EmployeeProfiles
                .FirstOrDefaultAsync(ep => ep.UserId == userId);

            if (employeeProfile == null || timesheet.EmployeeId != employeeProfile.Id)
                return Forbid();

            _context.Timesheets.Remove(timesheet);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // PATCH: api/timesheets/{id}/submit
        [HttpPatch("{id}/submit")]
        [Authorize]
        public async Task<IActionResult> SubmitTimesheet(string id)
        {
            var timesheet = await _context.Timesheets
                .Include(t => t.Employee).ThenInclude(e => e!.User)
                .FirstOrDefaultAsync(t => t.Id == id);
            if (timesheet == null) return NotFound();

            var isResubmission = timesheet.Status == TimesheetStatus.Rejected;
            timesheet.Status = isResubmission ? TimesheetStatus.Resubmitted : TimesheetStatus.Submitted;
            timesheet.SubmittedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // Notify the employee's manager (mirrors Apply Leave flow)
            if (timesheet.Employee == null)
            {
                _logger.LogWarning("Timesheet {Id}: Employee not loaded, skipping manager notification", timesheet.Id);
            }
            else if (string.IsNullOrWhiteSpace(timesheet.Employee.ManagerId))
            {
                _logger.LogInformation("Timesheet {Id}: Employee {EmployeeId} has no ManagerId set, skipping notification", timesheet.Id, timesheet.EmployeeId);
            }
            else
            {
                var managerProfile = await _context.EmployeeProfiles
                    .Include(mp => mp.User)
                    .FirstOrDefaultAsync(mp => mp.Id == timesheet.Employee.ManagerId);

                if (managerProfile == null)
                {
                    _logger.LogWarning("Timesheet {Id}: Manager profile {ManagerId} not found", timesheet.Id, timesheet.Employee.ManagerId);
                }
                else if (managerProfile.User == null || string.IsNullOrWhiteSpace(managerProfile.User.Email))
                {
                    _logger.LogWarning("Timesheet {Id}: Manager {ManagerId} has no email", timesheet.Id, timesheet.Employee.ManagerId);
                }
                else
                {
                    var employeeName = timesheet.Employee.User?.DisplayName
                                       ?? timesheet.Employee.User?.Email
                                       ?? "Employee";
                    var period = $"{timesheet.PeriodStart:dd MMM yyyy} to {timesheet.PeriodEnd:dd MMM yyyy}";
                    var verb = isResubmission ? "resubmitted" : "submitted";
                    var subject = $"Timesheet {verb} by {employeeName}";
                    var htmlBody = $"""
            <p>Hello {managerProfile.User.DisplayName ?? managerProfile.User.Email},</p>
            <p><strong>{employeeName}</strong> has {verb} a timesheet for <strong>{period}</strong> ({timesheet.TotalHours:0.##} hours).</p>
            <p>Please log in to WorkTrack to review and take action.</p>
            """;
                    var textBody = $"""
            Hello {managerProfile.User.DisplayName ?? managerProfile.User.Email},
            {employeeName} has {verb} a timesheet for {period} ({timesheet.TotalHours:0.##} hours).
            Please log in to WorkTrack to review and take action.
            """;

                    try
                    {
                        await _emailService.SendEmailAsync(
                            managerProfile.User.Email,
                            subject,
                            htmlBody,
                            textBody);
                        _logger.LogInformation("Timesheet {Id}: notification email sent to manager {Email}", timesheet.Id, managerProfile.User.Email);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Timesheet {Id}: failed to send notification email to {Email}", timesheet.Id, managerProfile.User.Email);
                    }
                }
            }

            return NoContent();
        }

        // PATCH: api/timesheets/{id}/approve
        [HttpPatch("{id}/approve")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> ApproveTimesheet(string id)
        {
            var timesheet = await _context.Timesheets.FindAsync(id);
            if (timesheet == null) return NotFound();
            timesheet.Status = TimesheetStatus.Approved;
            timesheet.ApprovedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // PATCH: api/timesheets/{id}/reject
        [HttpPatch("{id}/reject")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<IActionResult> RejectTimesheet(string id)
        {
            var timesheet = await _context.Timesheets.FindAsync(id);
            if (timesheet == null) return NotFound();
            timesheet.Status = TimesheetStatus.Rejected;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // GET: api/timesheets/{id}/history
        [HttpGet("{id}/history")]
        [Authorize]
        public async Task<ActionResult<IEnumerable<TimesheetStatusHistory>>> GetStatusHistory(string id)
        {
            var history = await _context.TimesheetStatusHistories
                .Where(h => h.TimesheetId == id)
                .ToListAsync();
            return history;
        }

        /// <summary>
        /// Admin only: Retrieves status history across all timesheets, filterable by employee, department, date range, and status transition.
        /// </summary>
        [HttpGet("/api/admin/timesheets/history")]
        [ProducesResponseType(typeof(IEnumerable<TimesheetStatusHistory>), 200)]
        [ProducesResponseType(403)]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<IEnumerable<TimesheetStatusHistory>>> GetAllStatusHistories(
            [FromQuery] string? employeeId,
            [FromQuery] int? departmentId,
            [FromQuery] DateTime? from,
            [FromQuery] DateTime? to,
            [FromQuery] int? fromStatus,
            [FromQuery] int? toStatus)
        {
            var query = _context.TimesheetStatusHistories
                .Include(h => h.Timesheet)
                .AsQueryable();

            if (!string.IsNullOrEmpty(employeeId))
                query = query.Where(h => h.Timesheet!.EmployeeId == employeeId);
            if (departmentId.HasValue)
                query = query.Where(h => h.Timesheet!.DepartmentId == departmentId.Value);
            if (from.HasValue)
                query = query.Where(h => h.ChangedAt >= from.Value);
            if (to.HasValue)
                query = query.Where(h => h.ChangedAt <= to.Value);
            if (fromStatus.HasValue)
                query = query.Where(h => h.FromStatus == fromStatus.Value);
            if (toStatus.HasValue)
                query = query.Where(h => h.ToStatus == toStatus.Value);

            var result = await query.ToListAsync();
            return Ok(result);
        }

        /// <summary>
        /// Retrieves all status history entries across all timesheets for a specific employee. Scoped by role.
        /// </summary>
        [HttpGet("/api/employees/{employeeId}/timesheets/history")]
        [ProducesResponseType(typeof(IEnumerable<TimesheetStatusHistory>), 200)]
        [ProducesResponseType(403)]
        [Authorize]
        public async Task<ActionResult<IEnumerable<TimesheetStatusHistory>>> GetEmployeeStatusHistories(string employeeId)
        {
            var isAdmin = User.IsInRole("Admin");
            var userId = User.Identity?.Name;

            if (!isAdmin && userId != employeeId)
                return Forbid();

            var histories = await _context.TimesheetStatusHistories
                .Include(h => h.Timesheet)
                .Where(h => h.Timesheet!.EmployeeId == employeeId)
                .ToListAsync();
            return Ok(histories);
        }
    }
}
