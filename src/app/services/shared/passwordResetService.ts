import type { AxiosInstance } from 'axios'
import type { AuthRoleConfig } from './authConfig'

export interface PasswordResetRequestPayload {
    email: string
}

export interface PasswordResetVerifyPayload {
    email: string
    otp: string
}

export interface PasswordResetCompletePayload {
    email: string
    otp: string
    newPassword: string
    verificationToken?: string
}

export interface ChangePasswordPayload {
    currentPassword: string
    newPassword: string
    confirmPassword: string
}

export interface PasswordResetResponse {
    success?: boolean
    message?: string
    verificationToken?: string
    resetToken?: string
    token?: string
    data?: PasswordResetResponse
}

const parsePasswordResetPayload = (raw: PasswordResetResponse) => raw?.data ?? raw

export const createPasswordResetService = (axiosInstance: AxiosInstance, authConfig: AuthRoleConfig) => {
    const requestPasswordResetOtp = async (payload: PasswordResetRequestPayload) => {
        const response = await axiosInstance.post('/auth/forgot-password/request-otp', {
            email: payload.email,
            role: authConfig.role
        })

        return parsePasswordResetPayload(response.data)
    }

    const verifyPasswordResetOtp = async (payload: PasswordResetVerifyPayload) => {
        const response = await axiosInstance.post('/auth/forgot-password/verify-otp', {
            email: payload.email,
            otp: payload.otp,
            role: authConfig.role
        })

        return parsePasswordResetPayload(response.data)
    }

    const resetPassword = async (payload: PasswordResetCompletePayload) => {
        const response = await axiosInstance.post('/auth/forgot-password/reset-password', {
            email: payload.email,
            otp: payload.otp,
            newPassword: payload.newPassword,
            verificationToken: payload.verificationToken,
            role: authConfig.role
        })

        return parsePasswordResetPayload(response.data)
    }

    const changePassword = async (payload: ChangePasswordPayload) => {
        const response = await axiosInstance.patch('/users/change-password', {
            currentPassword: payload.currentPassword,
            newPassword: payload.newPassword,
            confirmPassword: payload.confirmPassword
        })

        return parsePasswordResetPayload(response.data)
    }

    return {
        requestPasswordResetOtp,
        verifyPasswordResetOtp,
        resetPassword,
        changePassword
    }
}