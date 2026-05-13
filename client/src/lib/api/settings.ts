import apiClient from './client'
import type { AppSettings } from '../types'

export async function getAppSettings(): Promise<AppSettings> {
    const res = await apiClient.get<AppSettings>('/settings')
    return res.data
}

export async function updateAppSettings(data: AppSettings): Promise<AppSettings> {
    const res = await apiClient.put<AppSettings>('/settings', data)
    return res.data
}
