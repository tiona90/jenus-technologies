using Application.Timesheets;
using Domain;
using Xunit;

namespace WorkTrack.Tests.Application;

public class AttendanceHoursCalculatorTests
{
    private static AttendanceEvent Event(DateTime at, AttendanceEventType type) => new()
    {
        Id = Guid.NewGuid().ToString(),
        EmployeeId = "emp-1",
        At = DateTime.SpecifyKind(at, DateTimeKind.Utc),
        Type = type,
    };

    [Fact]
    public void Single_Day_Without_Breaks_Returns_Full_Duration()
    {
        var day = new DateTime(2026, 5, 11, 0, 0, 0, DateTimeKind.Utc);
        var events = new[]
        {
            Event(day.AddHours(9), AttendanceEventType.CheckIn),
            Event(day.AddHours(17), AttendanceEventType.CheckOut),
        };

        var result = AttendanceHoursCalculator.Calculate(events);

        Assert.Single(result);
        Assert.Equal(day, result[0].Date);
        Assert.Equal(8.00m, result[0].Hours);
    }

    [Fact]
    public void Break_Time_Is_Subtracted_From_Worked_Hours()
    {
        var day = new DateTime(2026, 5, 11, 0, 0, 0, DateTimeKind.Utc);
        var events = new[]
        {
            Event(day.AddHours(9), AttendanceEventType.CheckIn),
            Event(day.AddHours(12), AttendanceEventType.BreakStart),
            Event(day.AddHours(13), AttendanceEventType.BreakEnd),
            Event(day.AddHours(17), AttendanceEventType.CheckOut),
        };

        var result = AttendanceHoursCalculator.Calculate(events);

        // 8h elapsed minus 1h break = 7h.
        Assert.Equal(7.00m, result[0].Hours);
    }

    [Fact]
    public void Multiple_Breaks_All_Subtract()
    {
        var day = new DateTime(2026, 5, 11, 0, 0, 0, DateTimeKind.Utc);
        var events = new[]
        {
            Event(day.AddHours(9), AttendanceEventType.CheckIn),
            Event(day.AddHours(11), AttendanceEventType.BreakStart),
            Event(day.AddHours(11).AddMinutes(15), AttendanceEventType.BreakEnd),
            Event(day.AddHours(13), AttendanceEventType.BreakStart),
            Event(day.AddHours(14), AttendanceEventType.BreakEnd),
            Event(day.AddHours(17), AttendanceEventType.CheckOut),
        };

        var result = AttendanceHoursCalculator.Calculate(events);

        // 8h elapsed minus 15min minus 60min = 6h45m = 6.75h.
        Assert.Equal(6.75m, result[0].Hours);
    }

    [Fact]
    public void Unclosed_Checkin_Is_Dropped()
    {
        var day = new DateTime(2026, 5, 11, 0, 0, 0, DateTimeKind.Utc);
        var events = new[]
        {
            Event(day.AddHours(9), AttendanceEventType.CheckIn),
            // No checkout — we refuse to guess a duration.
        };

        var result = AttendanceHoursCalculator.Calculate(events);

        Assert.Empty(result);
    }

    [Fact]
    public void Multiple_Sessions_In_One_Day_Sum_Independently()
    {
        var day = new DateTime(2026, 5, 11, 0, 0, 0, DateTimeKind.Utc);
        var events = new[]
        {
            Event(day.AddHours(9), AttendanceEventType.CheckIn),
            Event(day.AddHours(12), AttendanceEventType.CheckOut),
            Event(day.AddHours(14), AttendanceEventType.CheckIn),
            Event(day.AddHours(17), AttendanceEventType.CheckOut),
        };

        var result = AttendanceHoursCalculator.Calculate(events);

        // 3h + 3h = 6h.
        Assert.Equal(6.00m, result[0].Hours);
    }

    [Fact]
    public void Each_Day_Is_Reported_Separately()
    {
        var monday = new DateTime(2026, 5, 11, 0, 0, 0, DateTimeKind.Utc);
        var tuesday = monday.AddDays(1);
        var events = new[]
        {
            Event(monday.AddHours(9), AttendanceEventType.CheckIn),
            Event(monday.AddHours(17), AttendanceEventType.CheckOut),
            Event(tuesday.AddHours(10), AttendanceEventType.CheckIn),
            Event(tuesday.AddHours(15), AttendanceEventType.CheckOut),
        };

        var result = AttendanceHoursCalculator.Calculate(events);

        Assert.Equal(2, result.Count);
        Assert.Equal(monday, result[0].Date);
        Assert.Equal(8.00m, result[0].Hours);
        Assert.Equal(tuesday, result[1].Date);
        Assert.Equal(5.00m, result[1].Hours);
    }

    [Fact]
    public void Break_Still_Open_At_Checkout_Counts_Up_To_Checkout()
    {
        // Edge case: employee checks out without ending their break first.
        // We close the break against the checkout time so the day is still
        // computable; otherwise the whole pre-break work would also vanish.
        var day = new DateTime(2026, 5, 11, 0, 0, 0, DateTimeKind.Utc);
        var events = new[]
        {
            Event(day.AddHours(9), AttendanceEventType.CheckIn),
            Event(day.AddHours(12), AttendanceEventType.BreakStart),
            Event(day.AddHours(17), AttendanceEventType.CheckOut),
        };

        var result = AttendanceHoursCalculator.Calculate(events);

        // 8h elapsed, 5h treated as break from 12:00..17:00 → 3h worked.
        Assert.Equal(3.00m, result[0].Hours);
    }

    [Fact]
    public void Empty_Input_Returns_Empty()
    {
        var result = AttendanceHoursCalculator.Calculate(Array.Empty<AttendanceEvent>());

        Assert.Empty(result);
    }
}
