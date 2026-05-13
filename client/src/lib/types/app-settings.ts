export interface AppSettings {
    leaveYearStartMonth: number
    maxCarryoverDays: number
    defaultAnnualEntitlement: number
    yearEndWarningDays: number
    finalWarningDays: number
    autoRunRollover: boolean
    sendYearEndWarningEmails: boolean
    blockLeaveSpanningIntoNextYear: boolean
    notifyManagersOfTeamExpiries: boolean
    holidayCountryCode: string | null
    holidayCountryName: string | null
}
