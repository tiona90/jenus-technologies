/* eslint-disable react-refresh/only-export-components -- intentional: dialog component and matching button sx tokens ship together */
import type { ReactNode } from 'react'
import type { Breakpoint } from '@mui/material'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'

export function AppDialog({
    open,
    onClose,
    maxWidth = 'sm',
    children,
}: {
    open: boolean
    onClose: () => void
    maxWidth?: Breakpoint | false
    children: ReactNode
}) {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth={maxWidth}
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: '12px',
                    // bgcolor falls back to theme.palette.background.paper automatically
                    // — MUI Dialog Paper does this by default, no override needed here.
                },
            }}
        >
            {children}
        </Dialog>
    )
}

export function AppDialogTitle({ children }: { children: ReactNode }) {
    return (
        <DialogTitle
            sx={{
                px: 3,
                py: 2,
                fontSize: 15,
                fontWeight: 600,
                color: 'text.primary',
                borderBottom: '1px solid',
                borderColor: 'divider',
            }}
        >
            {children}
        </DialogTitle>
    )
}

export function AppDialogContent({ children }: { children: ReactNode }) {
    return (
        <DialogContent sx={{ px: 3, pt: '20px !important', pb: 2 }}>
            {children}
        </DialogContent>
    )
}

export function AppDialogActions({ children }: { children: ReactNode }) {
    return (
        <DialogActions
            sx={{
                px: 3,
                py: 2,
                borderTop: '1px solid',
                borderColor: 'divider',
                gap: 1,
            }}
        >
            {children}
        </DialogActions>
    )
}

/** Consistent sx for the outlined Cancel button */
export const cancelBtnSx = {
    textTransform: 'none',
    color: 'text.secondary',
    borderColor: 'divider',
    '&:hover': { bgcolor: 'action.hover', borderColor: 'divider' },
} as const

/** Consistent sx for the primary Save/Confirm button */
export const saveBtnSx = {
    textTransform: 'none',
    bgcolor: 'primary.main',
    '&:hover': { bgcolor: 'primary.dark' },
    boxShadow: 'none',
} as const

/** Consistent sx for a destructive Confirm/Delete button */
export const dangerBtnSx = {
    textTransform: 'none',
    bgcolor: 'error.main',
    '&:hover': { bgcolor: 'error.dark' },
    boxShadow: 'none',
} as const
