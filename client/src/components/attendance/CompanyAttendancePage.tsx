import { useQuery } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { getCompanyAttendance } from '../../lib/api'
import { formatElapsed, formatTime } from '../../lib/hooks/useAttendance'
import type { AttendanceIssue, CompanyAttendance, IssueSeverity, RecentActivity } from '../../lib/types'

const C_BORDER = '#E4E6EA'
const C_HEADING = '#1A1A2E'
const C_MUTED = '#6B7280'
const BLUE = '#4F8EF7'
const GREEN = '#22C47A'
const AMBER = '#F59E0B'
const RED = '#FF4D4F'

const TH = {
    py: '10px',
    px: '14px',
    fontSize: 11,
    fontWeight: 600,
    color: C_MUTED,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    bgcolor: '#F9FAFB',
    borderBottom: `1px solid ${C_BORDER}`,
}

const TD = {
    py: '11px',
    px: '14px',
    fontSize: 13,
    color: '#374151',
    borderBottom: '1px solid #F3F4F6',
}

function StatCard({
    accent,
    icon,
    label,
    value,
    sub,
}: {
    accent: string
    icon: string
    label: string
    value: number | string
    sub: string
}) {
    return (
        <Paper elevation={0} sx={{
            bgcolor: '#fff',
            border: `1px solid ${C_BORDER}`,
            borderTop: `3px solid ${accent}`,
            borderRadius: '10px',
            p: '18px 20px',
        }}>
            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1 }}>
                <Typography sx={{ fontSize: 14 }}>{icon}</Typography>
                <Typography sx={{ fontSize: 12, color: C_MUTED }}>{label}</Typography>
            </Stack>
            <Typography sx={{ fontSize: 26, fontWeight: 700, color: C_HEADING, lineHeight: 1 }}>
                {value}
            </Typography>
            <Typography sx={{ fontSize: 11, color: C_MUTED, mt: 0.5 }}>{sub}</Typography>
        </Paper>
    )
}

function activityIcon(action: string) {
    if (action.includes('Late')) return '⚠️'
    if (action.includes('Not')) return '🔴'
    if (action.includes('break')) return '☕'
    if (action.includes('out')) return '🔴'
    return '🟢'
}

function ActivityRow({ r }: { r: RecentActivity }) {
    return (
        <Box sx={{
            display: 'grid',
            gridTemplateColumns: '32px 1fr auto',
            gap: 1.5, alignItems: 'center',
            p: '10px 12px',
            bgcolor: '#F9FAFB',
            borderRadius: '6px',
            fontSize: 12,
        }}>
            <Box sx={{
                width: 28, height: 28, borderRadius: '6px', bgcolor: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13,
            }}>
                {activityIcon(r.action)}
            </Box>
            <Box>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: C_HEADING }}>
                    {r.employeeName}{' '}
                    <Box component="span" sx={{ color: '#9CA3AF', fontWeight: 400, fontSize: 11 }}>
                        · {r.departmentName}
                    </Box>
                </Typography>
                <Typography sx={{ fontSize: 11, color: C_MUTED }}>
                    {r.action}{r.at ? ` at ${formatTime(r.at)}` : ''}
                </Typography>
            </Box>
            <Typography sx={{ fontSize: 11, color: C_MUTED, fontVariantNumeric: 'tabular-nums' }}>
                {r.minutesAgo == null
                    ? 'flagged'
                    : r.minutesAgo < 1
                        ? 'just now'
                        : r.minutesAgo < 60
                            ? `${r.minutesAgo} min ago`
                            : formatElapsed(r.minutesAgo) + ' ago'}
            </Typography>
        </Box>
    )
}

const ISSUE_STYLES: Record<IssueSeverity, { bg: string; border: string; title: string; detail: string }> = {
    danger:  { bg: '#FEE2E2', border: RED,   title: '#991B1B', detail: '#7F1D1D' },
    warning: { bg: '#FEF3C7', border: AMBER, title: '#92400E', detail: '#78350F' },
    info:    { bg: '#EFF6FF', border: BLUE,  title: '#1D4ED8', detail: '#1E3A8A' },
    success: { bg: '#D1FAE5', border: GREEN, title: '#065F46', detail: '#064E3B' },
}

function IssueCard({ issue }: { issue: AttendanceIssue }) {
    const s = ISSUE_STYLES[issue.severity]
    return (
        <Box sx={{
            bgcolor: s.bg,
            borderLeft: `3px solid ${s.border}`,
            borderRadius: '6px',
            p: '10px 12px',
        }}>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: s.title, mb: 0.5 }}>
                {issue.title}
            </Typography>
            <Typography sx={{ fontSize: 11, color: s.detail }}>
                {issue.detail}
            </Typography>
        </Box>
    )
}

function progressColor(pct: number) {
    return pct >= 80 ? GREEN : pct >= 60 ? AMBER : RED
}

function minutesToHours(min: number) {
    return (min / 60).toFixed(1)
}

function csvEscape(value: string): string {
    if (/[",\n\r]/.test(value)) {
        return `"${value.replace(/"/g, '""')}"`
    }
    return value
}

function exportRecentToCsv(data: CompanyAttendance) {
    const header = ['Employee', 'Department', 'Action', 'Time', 'Minutes ago']
    const rows = data.recent.map((r) => [
        csvEscape(r.employeeName),
        csvEscape(r.departmentName),
        csvEscape(r.action),
        r.at ? csvEscape(new Date(r.at).toISOString()) : '',
        r.minutesAgo == null ? '' : String(r.minutesAgo),
    ].join(','))
    const csv = [header.join(','), ...rows].join('\r\n')

    const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const today = new Date().toISOString().split('T')[0]
    a.href = url
    a.download = `company-attendance-${today}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

export default function CompanyAttendancePage() {
    const { data, isLoading } = useQuery({
        queryKey: ['attendance', 'company'],
        queryFn: getCompanyAttendance,
        refetchInterval: 30_000,
    })

    if (isLoading && !data) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress size={24} />
            </Box>
        )
    }

    if (!data) return null

    const inPct = data.total > 0 ? Math.round((data.in / data.total) * 100) : 0

    return (
        <Stack spacing={2}>
            {/* Top-level org stats */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1.75 }}>
                <StatCard
                    accent={GREEN}
                    icon="🟢"
                    label="Working Now"
                    value={data.in}
                    sub={`of ${data.total} employees · ${inPct}%`}
                />
                <StatCard
                    accent={AMBER}
                    icon="☕"
                    label="On Break"
                    value={data.break}
                    sub="employees"
                />
                <StatCard
                    accent={RED}
                    icon="⚪"
                    label="Not Checked In"
                    value={data.out}
                    sub={data.out > 0 ? 'requires follow-up' : 'all in'}
                />
                <StatCard
                    accent={BLUE}
                    icon="📅"
                    label="On Leave"
                    value={data.leave}
                    sub="today"
                />
            </Box>

            {/* Department breakdown */}
            <Paper elevation={0} sx={{ bgcolor: '#fff', border: `1px solid ${C_BORDER}`, borderRadius: '10px', overflow: 'hidden' }}>
                <Box sx={{
                    p: '14px 18px',
                    borderBottom: `1px solid ${C_BORDER}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 600, color: C_HEADING }}>By Department</Typography>
                    <Stack direction="row" alignItems="center" spacing={0.625}>
                        <Box sx={{
                            width: 6, height: 6, borderRadius: '50%', bgcolor: GREEN,
                            animation: 'pulse 2s infinite',
                            '@keyframes pulse': {
                                '0%,100%': { opacity: 1 },
                                '50%': { opacity: 0.6 },
                            },
                        }} />
                        <Typography sx={{ fontSize: 11, color: GREEN }}>Live · auto-refreshing</Typography>
                    </Stack>
                </Box>
                <Box sx={{ overflowX: 'auto' }}>
                    <Table sx={{ width: '100%', borderCollapse: 'collapse' }}>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={TH}>Department</TableCell>
                                <TableCell sx={TH}>Status</TableCell>
                                <TableCell sx={TH}>Working</TableCell>
                                <TableCell sx={TH}>Break</TableCell>
                                <TableCell sx={TH}>Off</TableCell>
                                <TableCell sx={TH}>Leave</TableCell>
                                <TableCell sx={TH}>Hrs Today</TableCell>
                                <TableCell sx={TH}>Avg/Person</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {data.departments.map((d) => {
                                const pct = d.total > 0 ? (d.in / d.total) * 100 : 0
                                return (
                                    <TableRow key={d.name} sx={{ '&:hover td': { bgcolor: '#F9FAFB' } }}>
                                        <TableCell sx={TD}>
                                            <Box component="strong">{d.name}</Box>{' '}
                                            <Box component="span" sx={{ color: '#9CA3AF', fontSize: 11 }}>({d.total})</Box>
                                        </TableCell>
                                        <TableCell sx={{ ...TD, minWidth: 160 }}>
                                            <Box sx={{ height: 6, bgcolor: '#E4E6EA', borderRadius: 3, overflow: 'hidden' }}>
                                                <Box sx={{ height: '100%', width: `${pct}%`, bgcolor: progressColor(pct), borderRadius: 3 }} />
                                            </Box>
                                            <Typography sx={{ fontSize: 10, color: C_MUTED, mt: '3px' }}>
                                                {Math.round(pct)}% in
                                            </Typography>
                                        </TableCell>
                                        <TableCell sx={TD}>
                                            <Box component="strong" sx={{ color: GREEN }}>{d.in}</Box>
                                        </TableCell>
                                        <TableCell sx={TD}>
                                            {d.break > 0
                                                ? <Box component="strong" sx={{ color: AMBER }}>{d.break}</Box>
                                                : <Box component="span" sx={{ color: '#9CA3AF' }}>0</Box>}
                                        </TableCell>
                                        <TableCell sx={TD}>
                                            {d.out > 0
                                                ? <Box component="strong" sx={{ color: RED }}>{d.out}</Box>
                                                : <Box component="span" sx={{ color: '#9CA3AF' }}>0</Box>}
                                        </TableCell>
                                        <TableCell sx={TD}>
                                            {d.leave > 0
                                                ? <Box component="strong" sx={{ color: BLUE }}>{d.leave}</Box>
                                                : <Box component="span" sx={{ color: '#9CA3AF' }}>0</Box>}
                                        </TableCell>
                                        <TableCell sx={TD}>
                                            <Box component="strong">{minutesToHours(d.totalMinutes)}</Box>
                                        </TableCell>
                                        <TableCell sx={TD}>{minutesToHours(d.avgMinutes)} h</TableCell>
                                    </TableRow>
                                )
                            })}
                            <TableRow sx={{ bgcolor: '#F9FAFB' }}>
                                <TableCell sx={{ ...TD, fontWeight: 600 }}>
                                    <Box component="strong">All departments</Box>
                                </TableCell>
                                <TableCell sx={TD}></TableCell>
                                <TableCell sx={TD}>
                                    <Box component="strong" sx={{ color: GREEN }}>{data.in}</Box>
                                </TableCell>
                                <TableCell sx={TD}>
                                    <Box component="strong">{data.break}</Box>
                                </TableCell>
                                <TableCell sx={TD}>
                                    <Box component="strong">{data.out}</Box>
                                </TableCell>
                                <TableCell sx={TD}>
                                    <Box component="strong">{data.leave}</Box>
                                </TableCell>
                                <TableCell sx={TD}>
                                    <Box component="strong">{minutesToHours(data.totalMinutesToday)}</Box>
                                </TableCell>
                                <TableCell sx={TD}>
                                    <Box component="strong">{minutesToHours(data.avgMinutesToday)} h</Box>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </Box>
            </Paper>

            {/* Recent activity + Issues */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.75 }}>
                <Paper elevation={0} sx={{ bgcolor: '#fff', border: `1px solid ${C_BORDER}`, borderRadius: '10px', overflow: 'hidden' }}>
                    <Box sx={{
                        p: '14px 18px',
                        borderBottom: `1px solid ${C_BORDER}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                        <Typography sx={{ fontSize: 14, fontWeight: 600, color: C_HEADING }}>Recent Activity</Typography>
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={() => exportRecentToCsv(data)}
                            disabled={data.recent.length === 0}
                            sx={{
                                fontSize: 12,
                                textTransform: 'none',
                                color: BLUE,
                                borderColor: BLUE,
                                px: 1.5, py: 0.5,
                                '&:hover': { bgcolor: '#EEF4FF', borderColor: BLUE },
                            }}
                        >
                            Export Log
                        </Button>
                    </Box>
                    <Box sx={{ p: 2.25 }}>
                        <Stack spacing={1}>
                            {data.recent.length === 0 ? (
                                <Typography sx={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', py: 3 }}>
                                    No activity yet today.
                                </Typography>
                            ) : (
                                data.recent.map((r, idx) => <ActivityRow key={`${r.employeeName}-${idx}`} r={r} />)
                            )}
                        </Stack>
                    </Box>
                </Paper>

                <Paper elevation={0} sx={{ bgcolor: '#fff', border: `1px solid ${C_BORDER}`, borderRadius: '10px', overflow: 'hidden' }}>
                    <Box sx={{ p: '14px 18px', borderBottom: `1px solid ${C_BORDER}` }}>
                        <Typography sx={{ fontSize: 14, fontWeight: 600, color: C_HEADING }}>
                            ⚠️ Today's Issues
                        </Typography>
                    </Box>
                    <Box sx={{ p: 2.25 }}>
                        <Stack spacing={1.25}>
                            {data.issues.length === 0 ? (
                                <Typography sx={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', py: 3 }}>
                                    No issues flagged.
                                </Typography>
                            ) : (
                                data.issues.map((issue, idx) => <IssueCard key={idx} issue={issue} />)
                            )}
                        </Stack>
                    </Box>
                </Paper>
            </Box>
        </Stack>
    )
}
