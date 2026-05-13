export type AttendanceStatus = 'out' | 'in' | 'break' | 'done'

export type AttendanceEventType = 'check-in' | 'check-out' | 'break-start' | 'break-end'

export interface AttendanceEvent {
    id: string
    at: string
    type: AttendanceEventType
}

export interface AttendanceToday {
    date: string
    status: AttendanceStatus
    checkInAt: string | null
    checkOutAt: string | null
    onBreakSince: string | null
    totalBreakMinutes: number
    workedMinutes: number
    events: AttendanceEvent[]
}

export type AttendanceHistoryStatus = 'complete' | 'in-progress' | 'late' | 'absent'

export interface AttendanceHistoryDay {
    date: string
    status: AttendanceHistoryStatus
    checkInAt: string | null
    checkOutAt: string | null
    totalBreakMinutes: number
    workedMinutes: number
}

export type TeamMemberStatus = 'in' | 'break' | 'out' | 'leave'

export interface TeamMemberAttendance {
    employeeId: string
    employeeName: string
    departmentName: string
    jobTitle: string | null
    status: TeamMemberStatus
    checkInAt: string | null
    workedMinutes: number
    onBreakSince: string | null
    todayNote: string
}

export interface WeekDayHours {
    date: string
    workedMinutes: number | null
    note: string | null
}

export interface TeamWeekRow {
    employeeId: string
    employeeName: string
    days: WeekDayHours[]
    totalMinutes: number
}

export interface TeamAttendance {
    members: TeamMemberAttendance[]
    week: TeamWeekRow[]
}

export interface DepartmentAttendance {
    name: string
    total: number
    in: number
    break: number
    out: number
    leave: number
    totalMinutes: number
    avgMinutes: number
}

export interface RecentActivity {
    employeeName: string
    departmentName: string
    action: string
    at: string | null
    minutesAgo: number | null
}

export type IssueSeverity = 'danger' | 'warning' | 'info' | 'success'

export interface AttendanceIssue {
    severity: IssueSeverity
    title: string
    detail: string
}

export interface CompanyAttendance {
    total: number
    in: number
    break: number
    out: number
    leave: number
    totalMinutesToday: number
    avgMinutesToday: number
    departments: DepartmentAttendance[]
    recent: RecentActivity[]
    issues: AttendanceIssue[]
}
