using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddLeaveTypeDesignFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "LeaveTypes",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AddColumn<string>(
                name: "AccrualNotes",
                table: "LeaveTypes",
                type: "nvarchar(250)",
                maxLength: 250,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "AllowanceUnit",
                table: "LeaveTypes",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "days/year");

            migrationBuilder.AddColumn<int>(
                name: "AttachmentPolicy",
                table: "LeaveTypes",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "ColorKey",
                table: "LeaveTypes",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "default");

            migrationBuilder.AddColumn<int>(
                name: "DefaultAllowance",
                table: "LeaveTypes",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "LeaveTypes",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "EligibilityNotes",
                table: "LeaveTypes",
                type: "nvarchar(250)",
                maxLength: 250,
                nullable: false,
                defaultValue: "All employees");

            migrationBuilder.AddColumn<int>(
                name: "EligibilityScope",
                table: "LeaveTypes",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "HalfDayAllowed",
                table: "LeaveTypes",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Icon",
                table: "LeaveTypes",
                type: "nvarchar(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "🏷️");

            migrationBuilder.AddColumn<int>(
                name: "MaxConsecutiveDays",
                table: "LeaveTypes",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "MinNoticeDays",
                table: "LeaveTypes",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "Paid",
                table: "LeaveTypes",
                type: "bit",
                nullable: false,
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AccrualNotes",
                table: "LeaveTypes");

            migrationBuilder.DropColumn(
                name: "AllowanceUnit",
                table: "LeaveTypes");

            migrationBuilder.DropColumn(
                name: "AttachmentPolicy",
                table: "LeaveTypes");

            migrationBuilder.DropColumn(
                name: "ColorKey",
                table: "LeaveTypes");

            migrationBuilder.DropColumn(
                name: "DefaultAllowance",
                table: "LeaveTypes");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "LeaveTypes");

            migrationBuilder.DropColumn(
                name: "EligibilityNotes",
                table: "LeaveTypes");

            migrationBuilder.DropColumn(
                name: "EligibilityScope",
                table: "LeaveTypes");

            migrationBuilder.DropColumn(
                name: "HalfDayAllowed",
                table: "LeaveTypes");

            migrationBuilder.DropColumn(
                name: "Icon",
                table: "LeaveTypes");

            migrationBuilder.DropColumn(
                name: "MaxConsecutiveDays",
                table: "LeaveTypes");

            migrationBuilder.DropColumn(
                name: "MinNoticeDays",
                table: "LeaveTypes");

            migrationBuilder.DropColumn(
                name: "Paid",
                table: "LeaveTypes");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "LeaveTypes",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100);
        }
    }
}
