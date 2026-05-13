namespace Domain;

public class PublicHoliday
{
    public int Id { get; set; }
    public string CountryCode { get; set; } = string.Empty;
    public int Year { get; set; }
    public DateTime Date { get; set; }
    public string LocalName { get; set; } = string.Empty;
    public string EnglishName { get; set; } = string.Empty;
    public DateTime CachedAt { get; set; }
}
