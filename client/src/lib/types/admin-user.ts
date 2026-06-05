import type { UserRole } from './user'

export interface AdminUser {
    id: string
    userName: string
    email: string
    displayName: string
    imageUrl: string
    phoneNumber?: string | null
    dateOfBirth?: string | null // ISO date "yyyy-MM-dd"
    emailConfirmed: boolean
    roles: UserRole[]
}

export interface AdminCreateUserRequest {
    email: string
    displayName: string
    password: string
    roles: UserRole[]
    departmentId: number
    phoneNumber?: string | null
    dateOfBirth?: string | null
}

export interface AdminUpdateUserRequest {
    email: string
    displayName: string
    phoneNumber?: string | null
    dateOfBirth?: string | null
}

export interface AdminSetUserRolesRequest {
    roles: UserRole[]
}