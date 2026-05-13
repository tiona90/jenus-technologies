using Application.Core;
using Application.LeaveTypes.DTOs;
using MediatR;
using Persistence;

namespace Application.LeaveTypes.Commands;

public class CreateLeaveType
{
    public class Command : IRequest<Result<LeaveTypeDto>>
    {
        public required UpsertLeaveTypeRequest LeaveType { get; set; }
    }

    public class Handler(AppDbContext context) : IRequestHandler<Command, Result<LeaveTypeDto>>
    {
        public async Task<Result<LeaveTypeDto>> Handle(Command request, CancellationToken cancellationToken)
        {
            var normalizedName = request.LeaveType.Name.Trim();

            if (string.IsNullOrWhiteSpace(normalizedName))
                return Result<LeaveTypeDto>.Failure("Leave type name is required.");

            if (context.LeaveTypes.Any(lt => lt.Name.ToLower() == normalizedName.ToLower()))
                return Result<LeaveTypeDto>.Failure("A leave type with that name already exists.");

            var dto = request.LeaveType;
            var leaveType = new Domain.LeaveType
            {
                Name = normalizedName,
                RequiresApproval = dto.RequiresApproval,
                IsActive = dto.IsActive,
                AffectsBalance = dto.AffectsBalance,
                Icon = string.IsNullOrWhiteSpace(dto.Icon) ? "🏷️" : dto.Icon.Trim(),
                ColorKey = string.IsNullOrWhiteSpace(dto.ColorKey) ? "default" : dto.ColorKey.Trim(),
                Description = (dto.Description ?? string.Empty).Trim(),
                Paid = dto.Paid,
                AttachmentPolicy = dto.AttachmentPolicy,
                DefaultAllowance = dto.DefaultAllowance,
                AllowanceUnit = string.IsNullOrWhiteSpace(dto.AllowanceUnit) ? "days/year" : dto.AllowanceUnit.Trim(),
                AccrualNotes = (dto.AccrualNotes ?? string.Empty).Trim(),
                MinNoticeDays = dto.MinNoticeDays,
                MaxConsecutiveDays = dto.MaxConsecutiveDays,
                HalfDayAllowed = dto.HalfDayAllowed,
                EligibilityNotes = string.IsNullOrWhiteSpace(dto.EligibilityNotes) ? "All employees" : dto.EligibilityNotes.Trim(),
                EligibilityScope = dto.EligibilityScope
            };

            context.LeaveTypes.Add(leaveType);
            await context.SaveChangesAsync(cancellationToken);

            return Result<LeaveTypeDto>.Success(ToDto(leaveType));
        }

        private static LeaveTypeDto ToDto(Domain.LeaveType lt) => new()
        {
            Id = lt.Id,
            Name = lt.Name,
            RequiresApproval = lt.RequiresApproval,
            IsActive = lt.IsActive,
            AffectsBalance = lt.AffectsBalance,
            Icon = lt.Icon,
            ColorKey = lt.ColorKey,
            Description = lt.Description,
            Paid = lt.Paid,
            AttachmentPolicy = lt.AttachmentPolicy,
            DefaultAllowance = lt.DefaultAllowance,
            AllowanceUnit = lt.AllowanceUnit,
            AccrualNotes = lt.AccrualNotes,
            MinNoticeDays = lt.MinNoticeDays,
            MaxConsecutiveDays = lt.MaxConsecutiveDays,
            HalfDayAllowed = lt.HalfDayAllowed,
            EligibilityNotes = lt.EligibilityNotes,
            EligibilityScope = lt.EligibilityScope
        };
    }
}
