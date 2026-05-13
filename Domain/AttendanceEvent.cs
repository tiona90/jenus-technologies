namespace Domain;

public enum AttendanceEventType
{
    CheckIn = 0,
    CheckOut = 1,
    BreakStart = 2,
    BreakEnd = 3,
}

public class AttendanceEvent
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string EmployeeId { get; set; } = string.Empty;
    public EmployeeProfile? Employee { get; set; }
    public DateTime At { get; set; }
    public AttendanceEventType Type { get; set; }
}
