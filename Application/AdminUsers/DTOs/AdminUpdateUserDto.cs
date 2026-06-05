using System.ComponentModel.DataAnnotations;

namespace Application.AdminUsers.DTOs;

public class AdminUpdateUserDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    [StringLength(100, MinimumLength = 2)]
    public string DisplayName { get; set; } = string.Empty;

    [Phone]
    [StringLength(30)]
    public string? PhoneNumber { get; set; }

    public DateOnly? DateOfBirth { get; set; }
}