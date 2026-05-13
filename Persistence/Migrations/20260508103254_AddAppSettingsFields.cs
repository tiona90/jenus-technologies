using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAppSettingsFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AutoRunRollover",
                table: "AppSettings",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "BlockLeaveSpanningIntoNextYear",
                table: "AppSettings",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "DefaultAnnualEntitlement",
                table: "AppSettings",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "FinalWarningDays",
                table: "AppSettings",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "MaxCarryoverDays",
                table: "AppSettings",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "NotifyManagersOfTeamExpiries",
                table: "AppSettings",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "SendYearEndWarningEmails",
                table: "AppSettings",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "YearEndWarningDays",
                table: "AppSettings",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AutoRunRollover",
                table: "AppSettings");

            migrationBuilder.DropColumn(
                name: "BlockLeaveSpanningIntoNextYear",
                table: "AppSettings");

            migrationBuilder.DropColumn(
                name: "DefaultAnnualEntitlement",
                table: "AppSettings");

            migrationBuilder.DropColumn(
                name: "FinalWarningDays",
                table: "AppSettings");

            migrationBuilder.DropColumn(
                name: "MaxCarryoverDays",
                table: "AppSettings");

            migrationBuilder.DropColumn(
                name: "NotifyManagersOfTeamExpiries",
                table: "AppSettings");

            migrationBuilder.DropColumn(
                name: "SendYearEndWarningEmails",
                table: "AppSettings");

            migrationBuilder.DropColumn(
                name: "YearEndWarningDays",
                table: "AppSettings");
        }
    }
}
