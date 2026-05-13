using Application.Annualleaves.Commands;
using Application.Core;
using Application.LeaveTypes.DTOs;
using Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Persistence;

namespace Application.LeaveTypes.Commands;

public class UpdateLeaveType
{
    public class Command : IRequest<Result<LeaveTypeDto>>
    {
        public int Id { get; set; }
        public required UpsertLeaveTypeRequest LeaveType { get; set; }
    }

    public class Handler(AppDbContext context) : IRequestHandler<Command, Result<LeaveTypeDto>>
    {
        public async Task<Result<LeaveTypeDto>> Handle(Command request, CancellationToken cancellationToken)
        {
            var leaveType = await context.LeaveTypes.FindAsync([request.Id], cancellationToken);
            if (leaveType is null)
                return Result<LeaveTypeDto>.Failure("Leave type not found.");

            var normalizedName = request.LeaveType.Name.Trim();

            if (string.IsNullOrWhiteSpace(normalizedName))
                return Result<LeaveTypeDto>.Failure("Leave type name is required.");

            if (context.LeaveTypes.Any(lt => lt.Id != request.Id && lt.Name.ToLower() == normalizedName.ToLower()))
                return Result<LeaveTypeDto>.Failure("A leave type with that name already exists.");

            var wasRequiringApproval = leaveType.RequiresApproval;

            var dto = request.LeaveType;
            leaveType.Name = normalizedName;
            leaveType.RequiresApproval = dto.RequiresApproval;
            leaveType.IsActive = dto.IsActive;
            leaveType.AffectsBalance = dto.AffectsBalance;
            leaveType.Icon = string.IsNullOrWhiteSpace(dto.Icon) ? "🏷️" : dto.Icon.Trim();
            leaveType.ColorKey = string.IsNullOrWhiteSpace(dto.ColorKey) ? "default" : dto.ColorKey.Trim();
            leaveType.Description = (dto.Description ?? string.Empty).Trim();
            leaveType.Paid = dto.Paid;
            leaveType.AttachmentPolicy = dto.AttachmentPolicy;
            leaveType.DefaultAllowance = dto.DefaultAllowance;
            leaveType.AllowanceUnit = string.IsNullOrWhiteSpace(dto.AllowanceUnit) ? "days/year" : dto.AllowanceUnit.Trim();
            leaveType.AccrualNotes = (dto.AccrualNotes ?? string.Empty).Trim();
            leaveType.MinNoticeDays = dto.MinNoticeDays;
            leaveType.MaxConsecutiveDays = dto.MaxConsecutiveDays;
            leaveType.HalfDayAllowed = dto.HalfDayAllowed;
            leaveType.EligibilityNotes = string.IsNullOrWhiteSpace(dto.EligibilityNotes) ? "All employees" : dto.EligibilityNotes.Trim();
            leaveType.EligibilityScope = dto.EligibilityScope;

            var affectedProfiles = new Dictionary<string, EmployeeProfile>();

            if (wasRequiringApproval && !leaveType.RequiresApproval && leaveType.IsActive)
            {
                var pendingLeaves = await context.AnnualLeaves
                    .Where(al => al.LeaveTypeId == leaveType.Id && al.Status == AnnualLeaveStatus.Pending)
                    .ToListAsync(cancellationToken);

                foreach (var annualLeave in pendingLeaves)
                {
                    var employeeProfile = await context.EmployeeProfiles
                        .FirstOrDefaultAsync(ep => ep.Id == annualLeave.EmployeeProfileId, cancellationToken);

                    if (employeeProfile is not null)
                    {
                        await AnnualLeaveBalanceCalculator.EnsureSufficientBalanceAsync(
                            context,
                            employeeProfile,
                            annualLeave,
                            excludeLeaveId: annualLeave.Id,
                            cancellationToken);

                        affectedProfiles[employeeProfile.Id] = employeeProfile;
                    }

                    annualLeave.Status = AnnualLeaveStatus.Approved;
                    annualLeave.ApprovedAt = DateTime.UtcNow;
                    annualLeave.ApprovedById = null;

                    context.LeaveStatusHistories.Add(new LeaveStatusHistory
                    {
                        Id = Guid.NewGuid().ToString(),
                        AnnualLeaveId = annualLeave.Id,
                        ChangedByUserId = annualLeave.EmployeeId,
                        OldStatus = AnnualLeaveStatus.Pending,
                        NewStatus = AnnualLeaveStatus.Approved,
                        Comment = "Automatically approved based on leave type settings.",
                        ChangedAt = DateTime.UtcNow,
                    });
                }
            }

            await context.SaveChangesAsync(cancellationToken);

            foreach (var employeeProfile in affectedProfiles.Values)
            {
                await AnnualLeaveBalanceCalculator.SyncCurrentYearBalanceAsync(context, employeeProfile, cancellationToken);
            }

            if (affectedProfiles.Count > 0)
            {
                await context.SaveChangesAsync(cancellationToken);
            }

            return Result<LeaveTypeDto>.Success(new LeaveTypeDto
            {
                Id = leaveType.Id,
                Name = leaveType.Name,
                RequiresApproval = leaveType.RequiresApproval,
                IsActive = leaveType.IsActive,
                AffectsBalance = leaveType.AffectsBalance,
                Icon = leaveType.Icon,
                ColorKey = leaveType.ColorKey,
                Description = leaveType.Description,
                Paid = leaveType.Paid,
                AttachmentPolicy = leaveType.AttachmentPolicy,
                DefaultAllowance = leaveType.DefaultAllowance,
                AllowanceUnit = leaveType.AllowanceUnit,
                AccrualNotes = leaveType.AccrualNotes,
                MinNoticeDays = leaveType.MinNoticeDays,
                MaxConsecutiveDays = leaveType.MaxConsecutiveDays,
                HalfDayAllowed = leaveType.HalfDayAllowed,
                EligibilityNotes = leaveType.EligibilityNotes,
                EligibilityScope = leaveType.EligibilityScope
            });
        }
    }
}
