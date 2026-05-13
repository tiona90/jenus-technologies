import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import {
    formatElapsed,
    formatTime12,
    useAttendanceActions,
    useAttendanceToday,
    useLiveElapsedMinutes,
} from '../../lib/hooks/useAttendance'

const C_BORDER = '#E4E6EA'
const C_MUTED = '#6B7280'
const C_HEADING = '#1A1A2E'
const GREEN = '#22C47A'
const GREEN_HOVER = '#18A867'
const AMBER = '#F59E0B'
const RED = '#FF4D4F'
const RED_HOVER = '#E03C3E'

const solidBtnSx = (bg: string, hover: string) => ({
    bgcolor: bg,
    color: '#fff',
    textTransform: 'none' as const,
    fontSize: 12,
    fontWeight: 500,
    lineHeight: 1,
    minHeight: 0,
    minWidth: 0,
    px: '14px',
    py: '6px',
    borderRadius: '6px',
    boxShadow: 'none',
    whiteSpace: 'nowrap' as const,
    '&:hover': { bgcolor: hover, boxShadow: 'none' },
})

const ghostBtnSx = {
    bgcolor: 'transparent',
    color: C_MUTED,
    border: `1px solid ${C_BORDER}`,
    textTransform: 'none' as const,
    fontSize: 12,
    fontWeight: 500,
    lineHeight: 1,
    minHeight: 0,
    minWidth: 0,
    px: '10px',
    py: '5px',
    borderRadius: '6px',
    boxShadow: 'none',
    whiteSpace: 'nowrap' as const,
    '&:hover': { bgcolor: '#fff', borderColor: C_BORDER, boxShadow: 'none' },
}

export default function AttendanceWidget({ enabled }: { enabled: boolean }) {
    const { data: today, isLoading } = useAttendanceToday(enabled)
    const { checkIn, checkOut, startBreak, endBreak, anyPending } = useAttendanceActions()
    const elapsed = useLiveElapsedMinutes(today)

    if (!enabled) return null

    const status = today?.status ?? 'out'

    const bg = status === 'in' ? '#ECFDF5' : status === 'break' ? '#FEF3C7' : '#F9FAFB'
    const border = status === 'in' ? '#A7F3D0' : status === 'break' ? '#FDE68A' : C_BORDER
    const dotColor = status === 'in' ? GREEN : status === 'break' ? AMBER : '#9CA3AF'

    return (
        <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            pl: '12px', pr: '4px', py: '4px',
            bgcolor: bg,
            border: `1px solid ${border}`,
            borderRadius: '8px',
            height: 38,
            flexShrink: 0,
        }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                <Box sx={{
                    width: 8, height: 8, borderRadius: '50%',
                    bgcolor: dotColor,
                    boxShadow: status === 'in' ? `0 0 0 3px rgba(34,196,122,0.2)` : 'none',
                    animation: status === 'in' ? 'pulse 2s infinite' : 'none',
                    '@keyframes pulse': {
                        '0%,100%': { opacity: 1 },
                        '50%': { opacity: 0.6 },
                    },
                    flexShrink: 0,
                }} />
                {isLoading && !today ? (
                    <Typography sx={{ fontSize: 12, color: C_MUTED, whiteSpace: 'nowrap' }}>Loading…</Typography>
                ) : status === 'out' ? (
                    <Typography sx={{ fontSize: 12, color: C_MUTED, whiteSpace: 'nowrap' }}>Not checked in</Typography>
                ) : status === 'in' ? (
                    <Typography sx={{ fontSize: 12, color: C_MUTED, whiteSpace: 'nowrap' }}>
                        In since{' '}
                        <Box component="span" sx={{
                            fontVariantNumeric: 'tabular-nums',
                            fontWeight: 600,
                            color: C_HEADING,
                            fontSize: 13,
                        }}>
                            {today?.checkInAt ? formatTime12(today.checkInAt) : ''}
                        </Box>
                    </Typography>
                ) : status === 'break' ? (
                    <Typography sx={{ fontSize: 12, color: C_MUTED, whiteSpace: 'nowrap' }}>On break</Typography>
                ) : (
                    <Typography sx={{ fontSize: 12, color: C_MUTED, whiteSpace: 'nowrap' }}>Done for today</Typography>
                )}
            </Box>

            {(status === 'in' || status === 'break') && (
                <>
                    <Box sx={{ width: '1px', height: 18, bgcolor: C_BORDER, flexShrink: 0 }} />
                    <Typography sx={{
                        fontSize: 11,
                        color: C_MUTED,
                        fontVariantNumeric: 'tabular-nums',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                    }}>
                        <Box component="strong" sx={{ color: C_HEADING, fontWeight: 700, fontSize: 13 }}>
                            {formatElapsed(elapsed)}
                        </Box>
                        {status === 'break' && ' worked'}
                    </Typography>
                </>
            )}

            {status === 'out' && (
                <Button
                    disableElevation
                    disabled={anyPending}
                    onClick={() => checkIn.mutate()}
                    startIcon={checkIn.isPending ? <CircularProgress size={11} color="inherit" /> : null}
                    sx={solidBtnSx(GREEN, GREEN_HOVER)}
                >
                    {checkIn.isPending ? 'Checking in…' : 'Check In'}
                </Button>
            )}

            {status === 'in' && (
                <Box sx={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <Button
                        disableElevation
                        disabled={anyPending}
                        onClick={() => startBreak.mutate()}
                        startIcon={startBreak.isPending ? <CircularProgress size={11} color="inherit" /> : null}
                        sx={ghostBtnSx}
                    >
                        Break
                    </Button>
                    <Button
                        disableElevation
                        disabled={anyPending}
                        onClick={() => checkOut.mutate()}
                        startIcon={checkOut.isPending ? <CircularProgress size={11} color="inherit" /> : null}
                        sx={solidBtnSx(RED, RED_HOVER)}
                    >
                        {checkOut.isPending ? 'Checking out…' : 'Check Out'}
                    </Button>
                </Box>
            )}

            {status === 'break' && (
                <Button
                    disableElevation
                    disabled={anyPending}
                    onClick={() => endBreak.mutate()}
                    startIcon={endBreak.isPending ? <CircularProgress size={11} color="inherit" /> : null}
                    sx={solidBtnSx(GREEN, GREEN_HOVER)}
                >
                    {endBreak.isPending ? 'Resuming…' : 'Resume'}
                </Button>
            )}
        </Box>
    )
}
