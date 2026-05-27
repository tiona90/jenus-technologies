import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import { softBg } from '../../lib/theme-tokens'
import {
    formatElapsed,
    formatTime12,
    useAttendanceActions,
    useAttendanceToday,
    useLiveElapsedMinutes,
} from '../../lib/hooks/useAttendance'

const GREEN = 'success.main'
const GREEN_HOVER = 'success.dark'
const AMBER = 'warning.main'
const RED = 'error.main'
const RED_HOVER = 'error.dark'

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
    color: 'text.secondary',
    border: '1px solid', borderColor: 'divider',
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
    '&:hover': { bgcolor: 'background.paper', borderColor: 'divider', boxShadow: 'none' },
}

export default function AttendanceWidget({ enabled }: { enabled: boolean }) {
    const { data: today, isLoading } = useAttendanceToday(enabled)
    const { checkIn, checkOut, startBreak, endBreak, anyPending } = useAttendanceActions()
    const elapsed = useLiveElapsedMinutes(today)

    if (!enabled) return null

    const status = today?.status ?? 'out'

    const bg = status === 'in' ? softBg('success') : status === 'break' ? softBg('warning') : 'action.hover'
    const border = status === 'in' ? '#A7F3D0' : status === 'break' ? '#FDE68A' : 'divider'
    const dotColor = status === 'in' ? GREEN : status === 'break' ? AMBER : 'text.disabled'

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
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', whiteSpace: 'nowrap' }}>Loading…</Typography>
                ) : status === 'out' ? (
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', whiteSpace: 'nowrap' }}>Not checked in</Typography>
                ) : status === 'in' ? (
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                        In since{' '}
                        <Box component="span" sx={{
                            fontVariantNumeric: 'tabular-nums',
                            fontWeight: 600,
                            color: 'text.primary',
                            fontSize: 13,
                        }}>
                            {today?.checkInAt ? formatTime12(today.checkInAt) : ''}
                        </Box>
                    </Typography>
                ) : status === 'break' ? (
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', whiteSpace: 'nowrap' }}>On break</Typography>
                ) : (
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', whiteSpace: 'nowrap' }}>Done for today</Typography>
                )}
            </Box>

            {(status === 'in' || status === 'break') && (
                <>
                    <Box sx={{ width: '1px', height: 18, bgcolor: 'divider', flexShrink: 0 }} />
                    <Typography sx={{
                        fontSize: 11,
                        color: 'text.secondary',
                        fontVariantNumeric: 'tabular-nums',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                    }}>
                        <Box component="strong" sx={{ color: 'text.primary', fontWeight: 700, fontSize: 13 }}>
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
