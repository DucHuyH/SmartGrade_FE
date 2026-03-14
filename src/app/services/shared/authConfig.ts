import { LECTURER_STORAGE_KEYS, STUDENT_STORAGE_KEYS } from '../../../constants'

export type AuthRole = 'lecturer' | 'student'

export interface AuthStorageKeys {
    TOKEN: string
    USER: string
}

export interface AuthRoleConfig {
    role: AuthRole
    loginPath: string
    logoutPath: string
    loginRedirectPath: string
    storageKeys: AuthStorageKeys
    pingPath?: string
}

export const lecturerAuthConfig: AuthRoleConfig = {
    role: 'lecturer',
    loginPath: 'login/lecturer',
    logoutPath: 'logout',
    loginRedirectPath: '/lecturer/login',
    storageKeys: LECTURER_STORAGE_KEYS,
    pingPath: 'ping'
}

export const studentAuthConfig: AuthRoleConfig = {
    role: 'student',
    loginPath: 'login/student',
    logoutPath: 'logout',
    loginRedirectPath: '/student/login',
    storageKeys: STUDENT_STORAGE_KEYS,
    pingPath: 'ping'
}
