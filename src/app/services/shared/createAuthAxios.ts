import axios from 'axios'
import type { AxiosInstance } from 'axios'
import { API_BASE_URL } from '../../../constants'
import type { AuthRoleConfig } from './authConfig'

const clearSession = (config: AuthRoleConfig) => {
    sessionStorage.removeItem(config.storageKeys.USER)
    sessionStorage.removeItem(config.storageKeys.TOKEN)
}

export const createAuthAxios = (authConfig: AuthRoleConfig): AxiosInstance => {
    const instance = axios.create({
        baseURL: API_BASE_URL,
        headers: {
            'Content-Type': 'application/json'
        },
        withCredentials: true
    })

    instance.interceptors.request.use(
        (config) => {
            const token = sessionStorage.getItem(authConfig.storageKeys.TOKEN)

            if (token) {
                config.headers.Authorization = `Bearer ${token}`
            }

            return config
        },
        (error) => Promise.reject(error)
    )

    instance.interceptors.response.use(
        (response) => response,
        (error) => {
            const originalRequestUrl = error.config?.url || ''

            if (error.response?.status === 401 && !originalRequestUrl.includes('login')) {
                clearSession(authConfig)
                window.location.href = authConfig.loginRedirectPath
            }

            return Promise.reject(error)
        }
    )

    return instance
}
