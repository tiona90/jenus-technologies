namespace Application.Holidays.DTOs;

public class HolidayDto
{
    public DateTime Date { get; set; }
    public string LocalName { get; set; } = string.Empty;
    public string EnglishName { get; set; } = string.Empty;
    public string CountryCode { get; set; } = string.Empty;
}
