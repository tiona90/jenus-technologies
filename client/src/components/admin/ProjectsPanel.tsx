import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import {
    AppDialog,
    AppDialogActions,
    AppDialogContent,
    AppDialogTitle,
    cancelBtnSx,
    saveBtnSx,
    SweetAlert,
} from '../ui'
import {
    createProject,
    deleteProject,
    getAdminUsers,
    getDepartments,
    getProjects,
    updateProject,
} from '../../lib/api'
import { getApiErrorMessage } from '../../lib/api/error-utils'
import type {
    AdminUser,
    Department,
    Project,
    ProjectStatus,
    UpsertProjectRequest,
} from '../../lib/types'

/* ─── tokens ─────────────────────────────────────────────────────────────── */

const C_BORDER = '#E4E6EA'
const C_HEADING = '#1A1A2E'
const C_MUTED = '#6B7280'
const C_BLUE = '#4F8EF7'
const C_GREEN = '#22C47A'
const C_AMBER = '#F59E0B'

const CODE_COLORS: Record<string, string> = {
    p1: '#4F8EF7', p2: '#22C47A', p3: '#F59E0B', p4: '#8B5CF6', p5: '#FF4D4F',
}
const COLOR_KEYS = Object.keys(CODE_COLORS)

const STATUS_COLORS = {
    Active:   { bg: '#D1FAE5', fg: '#065F46', dot: C_GREEN },
    OnHold:   { bg: '#FEF3C7', fg: '#92400E', dot: C_AMBER },
    Inactive: { bg: '#F3F4F6', fg: '#6B7280', dot: '#9CA3AF' },
} as const

const AVATAR_PALETTE = ['#4F8EF7', '#22C47A', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#FF4D4F']

type StatusFilter = 'all' | ProjectStatus
type DeptFilter = 'all' | number | 'cross'

/* ─── helpers ────────────────────────────────────────────────────────────── */

function initials(name: string) {
    const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}

function avatarBg(seed: string) {
    let hash = 0
    for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0
    return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length]
}

function statusLabel(s: ProjectStatus) {
    return s === 'Active' ? 'Active' : s === 'OnHold' ? 'On Hold' : 'Inactive'
}

function getErrorMessage(error: unknown) {
    return getApiErrorMessage(error, 'Something went wrong. Please try again.')
}

/* ════════════════════════════════════════════════════════════════════════ */

function ProjectsPanel() {
    const queryClient = useQueryClient()

    const [createOpen, setCreateOpen] = useState(false)
    const [editProject, setEditProject] = useState<Project | null>(null)
    const [searchText, setSearchText] = useState('')
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
    const [deptFilter, setDeptFilter] = useState<DeptFilter>('all')

    const { data: projects = [], isLoading, isError, error } = useQuery({
        queryKey: ['projects'],
        queryFn: getProjects,
    })
    const { data: departments = [] } = useQuery({
        queryKey: ['departments'],
        queryFn: getDepartments,
    })
    const { data: adminUsers = [] } = useQuery({
        queryKey: ['adminUsers'],
        queryFn: getAdminUsers,
    })

    const filtered = useMemo(() => {
        let out = projects
        if (statusFilter !== 'all') out = out.filter((p) => p.status === statusFilter)
        if (deptFilter === 'cross') out = out.filter((p) => !p.departmentId)
        else if (deptFilter !== 'all') out = out.filter((p) => p.departmentId === deptFilter)

        if (searchText.trim()) {
            const q = searchText.trim().toLowerCase()
            out = out.filter((p) =>
                p.name.toLowerCase().includes(q) ||
                p.code.toLowerCase().includes(q) ||
                (p.description ?? '').toLowerCase().includes(q)
            )
        }
        return [...out].sort((a, b) => a.name.localeCompare(b.name))
    }, [projects, statusFilter, deptFilter, searchText])

    /* Aggregate stats */
    const counts = useMemo(() => {
        const active = projects.filter((p) => p.status === 'Active').length
        const onHold = projects.filter((p) => p.status === 'OnHold').length
        const inactive = projects.filter((p) => p.status === 'Inactive').length
        const totalHoursYTD = projects.reduce((s, p) => s + p.hoursYTD, 0)
        const allMemberIds = new Set<string>()
        for (const p of projects) for (const t of p.team) allMemberIds.add(t.userId)
        const lowActivity = projects.filter((p) =>
            p.status === 'Active' && p.targetWeeklyHours > 0 && p.hoursThisWeek < p.targetWeeklyHours * 0.5
        ).length
        return { active, onHold, inactive, totalHoursYTD, members: allMemberIds.size, lowActivity }
    }, [projects])

    /* Mutations */
    const createMutation = useMutation({
        mutationFn: createProject,
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['projects'] })
            setCreateOpen(false)
        },
    })
    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: UpsertProjectRequest }) =>
            updateProject(id, payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['projects'] })
            setEditProject(null)
        },
    })
    const deleteMutation = useMutation({
        mutationFn: deleteProject,
        onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['projects'] }),
    })

    if (isLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress size={28} /></Box>
    }
    if (isError) {
        return <Box sx={{ p: 2 }}><Alert severity="error">{getErrorMessage(error)}</Alert></Box>
    }

    return (
        <Box>
            {deleteMutation.isError && (
                <Alert severity="error" sx={{ mb: 2 }}>{getErrorMessage(deleteMutation.error)}</Alert>
            )}

            {/* Stats row */}
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
                gap: '12px', mb: '14px',
            }}>
                <StatCard
                    label="📁 Active Projects"
                    value={String(counts.active)}
                    sub={`of ${projects.length} total · ${counts.onHold} on hold · ${counts.inactive} archived`}
                />
                <StatCard
                    label="⏱ Hours Logged YTD"
                    value={counts.totalHoursYTD.toLocaleString()}
                    valueColor={C_BLUE}
                    sub={`across all projects${counts.active > 0
                        ? ` · avg ${Math.round(counts.totalHoursYTD / counts.active)} per active`
                        : ''}`}
                />
                <StatCard
                    label="👥 Team Members"
                    value={String(counts.members)}
                    valueColor={C_GREEN}
                    sub="contributing across all projects"
                />
                <StatCard
                    label="⚠️ Low Activity"
                    value={String(counts.lowActivity)}
                    valueColor={counts.lowActivity > 0 ? C_AMBER : C_GREEN}
                    sub={counts.lowActivity === 0
                        ? 'all projects on track'
                        : `project${counts.lowActivity === 1 ? '' : 's'} < 50% target`}
                />
            </Box>

            {/* Toolbar */}
            <Box sx={{
                bgcolor: '#fff', border: `1px solid ${C_BORDER}`, borderRadius: '10px',
                p: '10px 12px', display: 'flex', gap: '10px', flexWrap: 'wrap',
                alignItems: 'center', mb: '14px',
            }}>
                <Box sx={{ flex: 1, minWidth: 200, maxWidth: 320 }}>
                    <Box
                        component="input"
                        type="search"
                        placeholder="Search projects…"
                        value={searchText}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
                        sx={{
                            width: '100%', p: '7px 10px', fontSize: 13, fontFamily: 'inherit',
                            border: `1px solid ${C_BORDER}`, borderRadius: '6px', outline: 'none',
                            '&:focus': { borderColor: C_BLUE, boxShadow: '0 0 0 3px rgba(79,142,247,0.1)' },
                        }}
                    />
                </Box>
                <SelectFilter
                    value={statusFilter}
                    onChange={(v) => setStatusFilter(v as StatusFilter)}
                    options={[
                        { value: 'all', label: `All statuses (${projects.length})` },
                        { value: 'Active', label: `Active (${counts.active})` },
                        { value: 'OnHold', label: `On Hold (${counts.onHold})` },
                        { value: 'Inactive', label: `Inactive (${counts.inactive})` },
                    ]}
                />
                <SelectFilter
                    value={String(deptFilter)}
                    onChange={(v) => setDeptFilter(v === 'all' ? 'all' : v === 'cross' ? 'cross' : Number(v))}
                    options={[
                        { value: 'all', label: 'All departments' },
                        ...departments.map((d) => ({ value: String(d.id), label: d.name })),
                        { value: 'cross', label: 'Cross-dept' },
                    ]}
                />
                <Box sx={{ flex: 1 }} />
                <Box
                    component="button"
                    onClick={() => setCreateOpen(true)}
                    sx={{
                        bgcolor: C_BLUE, color: '#fff', border: 'none', borderRadius: '6px',
                        px: '14px', py: '7px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                        fontFamily: 'inherit', whiteSpace: 'nowrap',
                        '&:hover': { bgcolor: '#3A7AE4' },
                    }}
                >
                    + New project
                </Box>
            </Box>

            {/* Grid */}
            {filtered.length === 0 ? (
                <Box sx={{
                    bgcolor: '#fff', border: `1px solid ${C_BORDER}`, borderRadius: '10px',
                    py: 6, textAlign: 'center', color: C_MUTED, fontSize: 13,
                }}>
                    No projects match the current filters.
                </Box>
            ) : (
                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
                    gap: '14px',
                }}>
                    {filtered.map((p) => (
                        <ProjectCard
                            key={p.id}
                            project={p}
                            onEdit={() => setEditProject(p)}
                            onDelete={async () => {
                                const result = await SweetAlert.fire({
                                    title: `Delete "${p.name}"?`,
                                    text: 'This will fail if the project has any logged timesheet entries.',
                                    icon: 'warning',
                                    showCancelButton: true,
                                    confirmButtonText: 'Yes, delete',
                                    cancelButtonText: 'Cancel',
                                    confirmButtonColor: '#EF4444',
                                    reverseButtons: true,
                                })
                                if (result.isConfirmed) deleteMutation.mutate(p.id)
                            }}
                        />
                    ))}
                    <AddCard onClick={() => setCreateOpen(true)} />
                </Box>
            )}

            <ProjectFormDialog
                key={createOpen ? 'pr-create-open' : 'pr-create-closed'}
                open={createOpen}
                title="New Project"
                departments={departments}
                users={adminUsers}
                isPending={createMutation.isPending}
                error={createMutation.error}
                onClose={() => setCreateOpen(false)}
                onSubmit={(payload) => createMutation.mutate(payload)}
            />
            <ProjectFormDialog
                key={editProject ? `pr-edit-${editProject.id}` : 'pr-edit-none'}
                open={!!editProject}
                title="Edit Project"
                initial={editProject ?? undefined}
                departments={departments}
                users={adminUsers}
                isPending={updateMutation.isPending}
                error={updateMutation.error}
                onClose={() => setEditProject(null)}
                onSubmit={(payload) => editProject && updateMutation.mutate({ id: editProject.id, payload })}
            />
        </Box>
    )
}

/* ════════════════════════════════════════════════════════════════════════ */
/* Card                                                                     */
/* ════════════════════════════════════════════════════════════════════════ */

function ProjectCard({ project, onEdit, onDelete }: {
    project: Project
    onEdit: () => void
    onDelete: () => void
}) {
    const p = project
    const codeColor = p.status === 'Inactive' ? '#9CA3AF' : (CODE_COLORS[p.colorKey] ?? CODE_COLORS.p1)
    const status = STATUS_COLORS[p.status]
    const weekPct = p.targetWeeklyHours > 0 ? (p.hoursThisWeek / p.targetWeeklyHours) * 100 : 0
    const fillColor = weekPct < 50 ? C_AMBER : weekPct >= 100 ? C_GREEN : C_BLUE
    const avgPerPerson = p.teamSize > 0 ? +(p.hoursThisWeek / p.teamSize).toFixed(1) : 0

    const visibleTeam = p.team.slice(0, 6)
    const remaining = p.teamSize - visibleTeam.length
    const topContributors = p.team.slice(0, 3).filter((t) => t.hoursThisWeek > 0)
    const deptName = p.departmentName ?? 'Cross-dept'

    const isInactive = p.status === 'Inactive'

    return (
        <Box sx={{
            bgcolor: isInactive ? '#FAFBFC' : '#fff',
            border: `1px solid ${C_BORDER}`, borderRadius: '12px',
            overflow: 'hidden', transition: 'all 0.15s',
            display: 'flex', flexDirection: 'column',
            opacity: isInactive ? 0.7 : 1,
            '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 20px rgba(0,0,0,0.06)' },
        }}>
            {/* Header */}
            <Box sx={{
                p: '16px 18px', borderBottom: '1px solid #F3F4F6',
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px',
            }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{
                        display: 'inline-block', bgcolor: codeColor, color: '#fff',
                        fontSize: 11, fontWeight: 700, px: '8px', py: '3px',
                        borderRadius: '6px', letterSpacing: '0.02em', mb: '6px',
                    }}>{p.code}</Box>
                    <Box sx={{ fontSize: 16, fontWeight: 700, color: C_HEADING, lineHeight: 1.3, mb: '6px' }}>
                        {p.name}
                    </Box>
                    <Box sx={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <Box sx={{
                            fontSize: 11, px: '8px', py: '2px', borderRadius: '10px',
                            bgcolor: '#F4F5F7', color: C_MUTED, fontWeight: 500,
                        }}>{deptName}</Box>
                        {p.ownerName && (
                            <Box sx={{ fontSize: 11, color: C_MUTED }}>
                                Owner: <Box component="strong" sx={{ color: C_HEADING, fontWeight: 600 }}>{p.ownerName}</Box>
                            </Box>
                        )}
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <Box sx={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        px: '10px', py: '4px', borderRadius: '12px',
                        fontSize: 11, fontWeight: 600,
                        bgcolor: status.bg, color: status.fg, whiteSpace: 'nowrap',
                    }}>
                        <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: status.dot }} />
                        {statusLabel(p.status)}
                    </Box>
                </Box>
            </Box>

            {/* Team */}
            {p.teamSize > 0 ? (
                <Box sx={{ p: '12px 18px', borderBottom: '1px solid #F3F4F6' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: '8px' }}>
                        <Box sx={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                            Team
                        </Box>
                        <Box sx={{ fontSize: 13, fontWeight: 700, color: C_HEADING }}>
                            {p.teamSize}
                            <Box component="span" sx={{ fontSize: 11, color: C_MUTED, fontWeight: 500, ml: '4px' }}>
                                {p.teamSize === 1 ? 'person' : 'people'}
                            </Box>
                        </Box>
                    </Box>
                    <Box sx={{ display: 'flex' }}>
                        {visibleTeam.map((m) => (
                            <Box
                                key={m.userId}
                                title={m.displayName}
                                sx={{
                                    width: 32, height: 32, borderRadius: '50%',
                                    bgcolor: avatarBg(m.displayName || m.userId), color: '#fff',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 11, fontWeight: 600,
                                    border: '2px solid #fff',
                                    marginLeft: '-6px', '&:first-of-type': { marginLeft: 0 },
                                }}
                            >{initials(m.displayName)}</Box>
                        ))}
                        {remaining > 0 && (
                            <Box sx={{
                                width: 32, height: 32, borderRadius: '50%',
                                bgcolor: '#F4F5F7', color: C_MUTED,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 10, fontWeight: 600,
                                border: '2px solid #fff', marginLeft: '-6px',
                            }}>+{remaining}</Box>
                        )}
                    </Box>
                </Box>
            ) : (
                <Box sx={{
                    p: '12px 18px', borderBottom: '1px solid #F3F4F6',
                    bgcolor: '#FFFBEB', borderLeft: '3px solid #FDE68A',
                    fontSize: 11, color: '#92400E',
                }}>
                    ⚠ No team members assigned to this project
                </Box>
            )}

            {/* Hours */}
            <Box sx={{ p: '14px 18px', borderBottom: '1px solid #F3F4F6' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: '8px' }}>
                    <Box sx={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                        Hours logged
                    </Box>
                    <Box sx={{ fontSize: 11, color: C_MUTED }}>This week</Box>
                </Box>
                <Box sx={{ fontSize: 26, fontWeight: 700, color: C_HEADING, lineHeight: 1, mb: '8px' }}>
                    {p.hoursThisWeek}
                    <Box component="span" sx={{ fontSize: 13, fontWeight: 500, color: C_MUTED, ml: '4px' }}>
                        / {p.targetWeeklyHours}h
                    </Box>
                </Box>
                {p.targetWeeklyHours > 0 ? (
                    <>
                        <Box sx={{ height: 8, bgcolor: '#F4F5F7', borderRadius: '4px', overflow: 'hidden', mb: '10px' }}>
                            <Box sx={{
                                height: '100%', bgcolor: fillColor, borderRadius: '4px',
                                width: `${Math.min(100, weekPct)}%`, transition: 'width 0.3s',
                            }} />
                        </Box>
                        <Box sx={{ fontSize: 11, color: C_MUTED }}>
                            {weekPct < 50
                                ? `⚠ ${Math.max(0, p.targetWeeklyHours - p.hoursThisWeek).toFixed(0)}h below target · may need attention`
                                : weekPct >= 100
                                    ? `✓ ${(p.hoursThisWeek - p.targetWeeklyHours).toFixed(0)}h over target this week`
                                    : `${(p.targetWeeklyHours - p.hoursThisWeek).toFixed(0)}h remaining this week`}
                        </Box>
                    </>
                ) : (
                    <Box sx={{ fontSize: 11, color: '#9CA3AF', fontStyle: 'italic' }}>
                        {p.hoursThisWeek > 0 ? 'No weekly target set' : 'No activity this week'}
                    </Box>
                )}
            </Box>

            {/* Top contributors */}
            {topContributors.length > 0 && (
                <Box sx={{ p: '12px 18px', borderBottom: '1px solid #F3F4F6' }}>
                    <Box sx={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, mb: '8px' }}>
                        Top contributors (this week)
                    </Box>
                    {topContributors.map((m) => (
                        <Box key={m.userId} sx={{
                            display: 'grid', gridTemplateColumns: '20px 1fr auto',
                            gap: '8px', alignItems: 'center', mb: '6px', '&:last-child': { mb: 0 },
                        }}>
                            <Box sx={{
                                width: 18, height: 18, borderRadius: '50%',
                                bgcolor: avatarBg(m.displayName || m.userId), color: '#fff',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 8, fontWeight: 600,
                            }}>{initials(m.displayName)}</Box>
                            <Box sx={{ fontSize: 12, color: C_HEADING, fontWeight: 500 }}>{m.displayName}</Box>
                            <Box sx={{ fontSize: 11, color: C_MUTED, fontWeight: 600 }}>{m.hoursThisWeek}h</Box>
                        </Box>
                    ))}
                </Box>
            )}

            {/* Stats triplet */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1px', bgcolor: '#F3F4F6', mt: 'auto' }}>
                <CardStat label="YTD hours" value={p.hoursYTD.toLocaleString()} sub="total logged" />
                <CardStat
                    label="Team"
                    value={String(p.teamSize)}
                    sub={p.teamSize === 1 ? 'person' : 'people'}
                />
                <CardStat
                    label="Avg/week"
                    value={avgPerPerson > 0 ? avgPerPerson.toFixed(1) : '—'}
                    sub="hrs per person"
                    valueColor={avgPerPerson > 0 && avgPerPerson < 10 && p.status === 'Active' ? C_AMBER : undefined}
                />
            </Box>

            {/* Footer */}
            <Box sx={{
                display: 'flex', gap: '6px', p: '10px 14px',
                bgcolor: '#FAFBFC',
            }}>
                <OutlineBtn flex onClick={onEdit}>✏️ Edit</OutlineBtn>
                <OutlineBtn flex danger onClick={onDelete}>🗑 Delete</OutlineBtn>
            </Box>
        </Box>
    )
}

function AddCard({ onClick }: { onClick: () => void }) {
    return (
        <Box
            component="button"
            onClick={onClick}
            sx={{
                bgcolor: '#FAFBFC', border: `2px dashed #D1D5DB`,
                borderRadius: '12px', p: '40px 20px', minHeight: 440,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center',
                color: C_MUTED, transition: 'all 0.15s',
                '&:hover': { borderColor: C_BLUE, bgcolor: '#EEF4FF', transform: 'translateY(-2px)' },
            }}
        >
            <Box sx={{
                width: 56, height: 56, borderRadius: '50%',
                bgcolor: '#fff', border: '2px dashed #D1D5DB',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, color: C_MUTED, mb: '12px',
            }}>+</Box>
            <Box sx={{ fontSize: 14, fontWeight: 600, color: C_HEADING, mb: '4px' }}>Create a new project</Box>
            <Box sx={{ fontSize: 12, color: C_MUTED, lineHeight: 1.5 }}>
                Set up a project code, assign a team,<br/>and start tracking time
            </Box>
        </Box>
    )
}

/* ────── small UI bits ──────────────────────────────────────────────────── */

function CardStat({ label, value, sub, valueColor }: {
    label: string
    value: string
    sub: string
    valueColor?: string
}) {
    return (
        <Box sx={{ bgcolor: '#fff', p: '12px 14px', textAlign: 'center' }}>
            <Box sx={{ fontSize: 10, color: C_MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', mb: '4px' }}>
                {label}
            </Box>
            <Box sx={{ fontSize: 17, fontWeight: 700, color: valueColor ?? C_HEADING, lineHeight: 1 }}>{value}</Box>
            <Box sx={{ fontSize: 10, color: C_MUTED, mt: '2px' }}>{sub}</Box>
        </Box>
    )
}

function StatCard({ label, value, sub, valueColor }: {
    label: string
    value: string
    sub: string
    valueColor?: string
}) {
    return (
        <Box sx={{ bgcolor: '#fff', border: `1px solid ${C_BORDER}`, borderRadius: '12px', p: '14px 16px' }}>
            <Box sx={{ fontSize: 11, color: C_MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', mb: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {label}
            </Box>
            <Box sx={{ fontSize: 26, fontWeight: 700, color: valueColor ?? C_HEADING, lineHeight: 1 }}>{value}</Box>
            <Box sx={{ fontSize: 11, color: C_MUTED, mt: '6px' }}>{sub}</Box>
        </Box>
    )
}

function SelectFilter({ value, onChange, options }: {
    value: string
    onChange: (v: string) => void
    options: { value: string; label: string }[]
}) {
    return (
        <Box
            component="select"
            value={value}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
            sx={{
                fontSize: 12, fontFamily: 'inherit', p: '7px 10px',
                border: `1px solid ${C_BORDER}`, borderRadius: '6px',
                color: '#374151', bgcolor: '#fff', outline: 'none', cursor: 'pointer',
                '&:focus': { borderColor: C_BLUE },
            }}
        >
            {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Box>
    )
}

function OutlineBtn({ children, onClick, flex, danger }: {
    children: React.ReactNode
    onClick: () => void
    flex?: boolean
    danger?: boolean
}) {
    return (
        <Box
            component="button"
            onClick={onClick}
            sx={{
                bgcolor: '#fff', color: danger ? '#FF4D4F' : C_HEADING,
                border: `1px solid ${danger ? '#FECACA' : C_BORDER}`,
                borderRadius: '6px', px: '12px', py: '6px',
                fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                flex: flex ? 1 : 'initial',
                '&:hover': danger
                    ? { bgcolor: '#FFF5F5', borderColor: '#FECACA' }
                    : { bgcolor: '#F4F5F7', borderColor: C_BLUE, color: C_BLUE },
            }}
        >
            {children}
        </Box>
    )
}

/* ════════════════════════════════════════════════════════════════════════ */
/* Form dialog                                                               */
/* ════════════════════════════════════════════════════════════════════════ */

function ProjectFormDialog(props: {
    open: boolean
    title: string
    initial?: Project
    departments: Department[]
    users: AdminUser[]
    isPending: boolean
    error: Error | null
    onClose: () => void
    onSubmit: (payload: UpsertProjectRequest) => void
}) {
    const i = props.initial
    const [name, setName] = useState(i?.name ?? '')
    const [code, setCode] = useState(i?.code ?? '')
    const [description, setDescription] = useState(i?.description ?? '')
    const [status, setStatus] = useState<ProjectStatus>(i?.status ?? 'Active')
    const [departmentId, setDepartmentId] = useState<string>(i?.departmentId != null ? String(i.departmentId) : '')
    const [ownerId, setOwnerId] = useState<string>(i?.ownerId ?? '')
    const [colorKey, setColorKey] = useState<string>(i?.colorKey ?? 'p1')
    const [targetWeeklyHours, setTargetWeeklyHours] = useState<number>(i?.targetWeeklyHours ?? 0)
    const [targetMonthlyHours, setTargetMonthlyHours] = useState<number>(i?.targetMonthlyHours ?? 0)

    useEffect(() => {
        if (!props.open) return
        const x = props.initial
        setName(x?.name ?? '')
        setCode(x?.code ?? '')
        setDescription(x?.description ?? '')
        setStatus(x?.status ?? 'Active')
        setDepartmentId(x?.departmentId != null ? String(x.departmentId) : '')
        setOwnerId(x?.ownerId ?? '')
        setColorKey(x?.colorKey ?? 'p1')
        setTargetWeeklyHours(x?.targetWeeklyHours ?? 0)
        setTargetMonthlyHours(x?.targetMonthlyHours ?? 0)
    }, [props.open, props.initial])

    useEffect(() => {
        // Auto-generate a code only for new projects with no manual code yet
        if (props.initial) return
        if (!name.trim()) { setCode(''); return }
        const slug = name
            .split(/\s+/)
            .filter(Boolean)
            .map((w) => w[0]?.toUpperCase() || '')
            .join('')
            .padEnd(3, 'X')
            .slice(0, 5)
        setCode(`${slug}-001`)
    }, [name, props.initial])

    const submit = () => {
        props.onSubmit({
            name: name.trim(),
            code: code.trim(),
            description: description.trim(),
            isActive: status !== 'Inactive',
            status,
            departmentId: departmentId === '' ? null : Number(departmentId),
            ownerId: ownerId === '' ? null : ownerId,
            colorKey,
            targetWeeklyHours: Number(targetWeeklyHours) || 0,
            targetMonthlyHours: Number(targetMonthlyHours) || 0,
        })
    }

    return (
        <AppDialog open={props.open} onClose={props.onClose} maxWidth="sm">
            <AppDialogTitle>{props.title}</AppDialogTitle>
            <AppDialogContent>
                <Stack spacing={2}>
                    <Stack direction="row" spacing={2}>
                        <TextField
                            label="Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            fullWidth
                            required
                            inputProps={{ maxLength: 150 }}
                            autoFocus
                        />
                        <TextField
                            label="Code"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            sx={{ width: 160 }}
                            required
                            inputProps={{ maxLength: 20 }}
                        />
                    </Stack>

                    <TextField
                        label="Description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        fullWidth
                        multiline
                        minRows={2}
                        inputProps={{ maxLength: 500 }}
                    />

                    <Stack direction="row" spacing={2}>
                        <TextField
                            select
                            label="Status"
                            value={status}
                            onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                            sx={{ flex: 1 }}
                        >
                            <MenuItem value="Active">Active</MenuItem>
                            <MenuItem value="OnHold">On Hold</MenuItem>
                            <MenuItem value="Inactive">Inactive</MenuItem>
                        </TextField>
                        <TextField
                            select
                            label="Color"
                            value={colorKey}
                            onChange={(e) => setColorKey(e.target.value)}
                            sx={{ width: 140 }}
                        >
                            {COLOR_KEYS.map((c) => (
                                <MenuItem key={c} value={c}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Box sx={{ width: 12, height: 12, borderRadius: '3px', bgcolor: CODE_COLORS[c] }} />
                                        {c}
                                    </Box>
                                </MenuItem>
                            ))}
                        </TextField>
                    </Stack>

                    <Stack direction="row" spacing={2}>
                        <TextField
                            select
                            label="Department"
                            value={departmentId}
                            onChange={(e) => setDepartmentId(e.target.value)}
                            fullWidth
                        >
                            <MenuItem value="">No department</MenuItem>
                            {props.departments.map((d) => (
                                <MenuItem key={d.id} value={String(d.id)}>{d.name}</MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            label="Owner"
                            value={ownerId}
                            onChange={(e) => setOwnerId(e.target.value)}
                            fullWidth
                        >
                            <MenuItem value="">No owner</MenuItem>
                            {props.users.map((u) => (
                                <MenuItem key={u.id} value={u.id}>{u.displayName || u.email}</MenuItem>
                            ))}
                        </TextField>
                    </Stack>

                    <Stack direction="row" spacing={2}>
                        <TextField
                            label="Target weekly hours"
                            type="number"
                            value={targetWeeklyHours}
                            onChange={(e) => setTargetWeeklyHours(Number(e.target.value))}
                            inputProps={{ min: 0, max: 1000 }}
                            fullWidth
                        />
                        <TextField
                            label="Target monthly hours"
                            type="number"
                            value={targetMonthlyHours}
                            onChange={(e) => setTargetMonthlyHours(Number(e.target.value))}
                            inputProps={{ min: 0, max: 5000 }}
                            fullWidth
                        />
                    </Stack>

                    {props.error != null && (
                        <Alert severity="error">{getErrorMessage(props.error)}</Alert>
                    )}
                </Stack>
            </AppDialogContent>
            <AppDialogActions>
                <Button variant="outlined" sx={cancelBtnSx} onClick={props.onClose} disabled={props.isPending}>Cancel</Button>
                <Button
                    variant="contained"
                    sx={saveBtnSx}
                    disabled={props.isPending || !name.trim() || !code.trim()}
                    onClick={submit}
                >
                    Save
                </Button>
            </AppDialogActions>
        </AppDialog>
    )
}

export default ProjectsPanel
