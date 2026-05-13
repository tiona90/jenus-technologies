import apiClient from './client'
import type { Project, UpsertProjectRequest } from '../types/project'

export async function getProjects(): Promise<Project[]> {
    const res = await apiClient.get<Project[]>('/projects')
    return res.data
}

export async function createProject(data: UpsertProjectRequest): Promise<Project> {
    const res = await apiClient.post<Project>('/projects', data)
    return res.data
}

export async function updateProject(id: number, data: UpsertProjectRequest): Promise<Project> {
    const res = await apiClient.put<Project>(`/projects/${id}`, data)
    return res.data
}

export async function deleteProject(id: number): Promise<void> {
    await apiClient.delete(`/projects/${id}`)
}
