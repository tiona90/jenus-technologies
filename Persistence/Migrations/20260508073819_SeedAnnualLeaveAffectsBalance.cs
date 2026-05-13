using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Persistence.Migrations
{
    /// <inheritdoc />
    public partial class SeedAnnualLeaveAffectsBalance : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("UPDATE LeaveTypes SET AffectsBalance = 1 WHERE LOWER(Name) = 'annual leave'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("UPDATE LeaveTypes SET AffectsBalance = 0 WHERE LOWER(Name) = 'annual leave'");
        }
    }
}
