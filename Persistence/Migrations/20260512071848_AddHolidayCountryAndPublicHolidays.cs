using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddHolidayCountryAndPublicHolidays : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "HolidayCountryCode",
                table: "AppSettings",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "HolidayCountryName",
                table: "AppSettings",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "PublicHolidays",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CountryCode = table.Column<string>(type: "nvarchar(2)", maxLength: 2, nullable: false),
                    Year = table.Column<int>(type: "int", nullable: false),
                    Date = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LocalName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    EnglishName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    CachedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PublicHolidays", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PublicHolidays_CountryCode_Date",
                table: "PublicHolidays",
                columns: new[] { "CountryCode", "Date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PublicHolidays_CountryCode_Year",
                table: "PublicHolidays",
                columns: new[] { "CountryCode", "Year" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PublicHolidays");

            migrationBuilder.DropColumn(
                name: "HolidayCountryCode",
                table: "AppSettings");

            migrationBuilder.DropColumn(
                name: "HolidayCountryName",
                table: "AppSettings");
        }
    }
}
