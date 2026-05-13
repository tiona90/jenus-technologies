import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    checkIn as apiCheckIn,
    checkOut as apiCheckOut,
    endBreak as apiEndBreak,
    getAttendanceToday,
    startBreak as apiStartBreak,
} from '../api/attendance'
import type { AttendanceToday } from '../types/attendance'

export const attendanceQueryKey = ['attendance', 'me', 'today'] as const

export function useAttendanceToday(enabled = true) {
    return useQuery({
        queryKey: attendanceQueryKey,
        queryFn: getAttendanceToday,
        enabled,
        refetchInterval: 60_000,
        refetchIntervalInBackground: true,
        staleTime: 30_000,
    })
}

export function useAttendanceActions() {
    const qc = useQueryClient()
    const onSuccess = (data: AttendanceToday) => {
        qc.setQueryData(attendanceQueryKey, data)
        void qc.invalidateQueries({ queryKey: ['attendance', 'history'] })
        void qc.invalidateQueries({ queryKey: ['attendance', 'team'] })
    }
    const checkIn = useMutation({ mutationFn: apiCheckIn, onSuccess })
    const checkOut = useMutation({ mutationFn: apiCheckOut, onSuccess })
    const startBreak = useMutation({ mutationFn: apiStartBreak, onSuccess })
    const endBreak = useMutation({ mutationFn: apiEndBreak, onSuccess })
    const anyPending = checkIn.isPending || checkOut.isPending || startBreak.isPending || endBreak.isPending
    return { checkIn, checkOut, startBreak, endBreak, anyPending }
}

export function useLiveElapsedMinutes(today: AttendanceToday | undefined): number {
    const [now, setNow] = useState<number>(() => Date.now())

    useEffect(() => {
        if (!today || today.status === 'out' || today.status === 'done') return
        const id = window.setInterval(() => setNow(Date.now()), 30_000)
        return () => window.clearInterval(id)
    }, [today])

    if (!today || !today.checkInAt) return 0
    if (today.status === 'done') return today.workedMinutes

    const checkInMs = new Date(today.checkInAt).getTime()
    const endMs = today.checkOutAt ? new Date(today.checkOutAt).getTime() : now
    const totalMs = endMs - checkInMs
    const closedBreakMs = today.totalBreakMinutes * 60_000
    const openBreakMs = today.onBreakSince ? Math.max(0, now - new Date(today.onBreakSince).getTime()) : 0
    return Math.max(0, Math.floor((totalMs - closedBreakMs - openBreakMs) / 60_000))
}

export function formatElapsed(minutes: number) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return `${h}h ${m.toString().padStart(2, '0')}m`
}

export function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function formatTime12(iso: string) {
    return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
}
