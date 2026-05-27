import { alpha, type Theme } from '@mui/material/styles'

// Soft semantic-tint backgrounds used for status pills, alerts, and hover
// states. `alpha` keeps them legible in both light and dark modes by tinting
// the theme's semantic colors rather than hardcoding pastel hex values.
//
// Usage: `<Box sx={{ bgcolor: softBg('error') }}>` — MUI's sx accepts a
// callback at the leaf level and calls it with the active theme.
export type SemanticPalette = 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success'

// Either a theme token string or a `(theme) => color` callback. Use this when
// typing records like STATUS_BADGE whose entries mix string tokens and
// alpha-tinted callbacks (the return shape of `softBg`).
export type SxColor = string | ((theme: Theme) => string)

export const softBg = (palette: SemanticPalette) => (theme: Theme) =>
    alpha(theme.palette[palette].main, theme.palette.mode === 'dark' ? 0.18 : 0.12)
