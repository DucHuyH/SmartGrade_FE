/* eslint-disable no-useless-catch */
import type { AxiosInstance } from 'axios'
import { toast } from 'react-toastify'
import type { AuthRoleConfig } from './authConfig'

const parseAuthPayload = (raw: any) => raw?.data ?? raw

export const createAuthService = (axiosInstance: AxiosInstance, authConfig: AuthRoleConfig) => {
    const login = async (email: string, password: string) => {
        try {
            const response = await axiosInstance.post(
                `/auth/${authConfig.loginPath}`,
                { email, password },
                { withCredentials: true }
            )

            const payload = parseAuthPayload(response.data)
            const user = payload?.user
            const token = payload?.token ?? payload?.accessToken
            const isSuccess = payload?.success === true

            if (isSuccess && user) {
                sessionStorage.setItem(authConfig.storageKeys.USER, JSON.stringify(user))
                if (token) {
                    sessionStorage.setItem(authConfig.storageKeys.TOKEN, token)
                }
            }

            return response.data
        } catch (error: any) {
            console.error('Login error:', error.response?.data?.data?.message || error.message)
            throw error
        }
    }

    const logout = async () => {
        try {
            const response = await axiosInstance.post(`/auth/${authConfig.logoutPath}`, {}, { withCredentials: true })
            if (response?.status === 200) {
                toast.success('Logout successful!')
            } else {
                toast.error('Failed to logout.')
            }
        } catch (error) {
            console.error('Logout error:', error)
            toast.error('An error occurred while logging out.')
        } finally {
            sessionStorage.removeItem(authConfig.storageKeys.USER)
            sessionStorage.removeItem(authConfig.storageKeys.TOKEN)
        }
    }

    const getCurrentUser = () => {
        const userStr = sessionStorage.getItem(authConfig.storageKeys.USER)
        return userStr ? JSON.parse(userStr) : null
    }

    const getToken = () => sessionStorage.getItem(authConfig.storageKeys.TOKEN)

    const isAuthenticated = () => !!sessionStorage.getItem(authConfig.storageKeys.USER)

    const ping = async () => {
        try {
            const response = await axiosInstance.post(`/auth/${authConfig.pingPath}`, {}, { withCredentials: true })
            return response.data
        } catch (error) {
            console.error('Ping error:', error)
            throw error
        }
    }

    // const changePassword = async (oldPassword: string, newPassword: string) => {
    //     try {
    //         const response = await axiosInstance.post(`/auth/${authConfig.changePasswordPath}`, {
    //             oldPassword,
    //             newPassword
    //         }, { withCredentials: true })
    //         return response.data
    //     } catch (error: any) {
    //         throw error
    //     }
    // }

    // const verifyToken = async () => {
    //     try {
    //         const response = await axiosInstance.get(`/auth/${authConfig.verifyTokenPath}`, { withCredentials: true })
    //         return response.data
    //     } catch (error: any) {
    //         throw error
    //     }
    // }

    return {
        login,
        logout,
        getCurrentUser,
        getToken,
        isAuthenticated,
        ping,
        // changePassword,
        // verifyToken
    }
}
