/* eslint-disable no-useless-catch */
import axiosInstance from './axios'
import { STUDENT_STORAGE_KEYS } from '../../../constants'

// Login
export const login = async (email: string, password: string) => {
  try {
    const response = await axiosInstance.post(
      'login/student', 
      { email, password }, 
      { withCredentials: true })

    if (response.data.success && response.data.user) {
      sessionStorage.setItem(STUDENT_STORAGE_KEYS.USER, JSON.stringify(response.data.user))
    }

    return response.data
  } catch (error: any) {
    console.error('Login error:', error.response?.data?.message || error.message)
    throw error
  }
}

// Logout
export const logout = async () => {
  try {
    // Gọi API logout để xóa cookie từ server
    await axiosInstance.post('logout', {}, { withCredentials: true })
  } catch (error) {
    console.error('Logout error:', error)
  } finally {
    // Xóa thông tin user khỏi sessionStorage
    sessionStorage.removeItem(STUDENT_STORAGE_KEYS.USER)
  }
}

// Get current user
export const getCurrentUser = () => {
  const userStr = sessionStorage.getItem(STUDENT_STORAGE_KEYS.USER)
  return userStr ? JSON.parse(userStr) : null
}

// Check if user is authenticated
// Kiểm tra xem có thông tin user trong session không
export const isAuthenticated = () => {
  return !!sessionStorage.getItem(STUDENT_STORAGE_KEYS.USER)
}

// Ping API - check session
export const ping = async () => {
  try {
    // Backend expects POST for ping (keep body empty and send cookies)
    const response = await axiosInstance.post('ping', {}, { withCredentials: true })
    return response.data
  } catch (error) {
    console.error('Ping error:', error)
    throw error
  }
}

// Change password
export const changePassword = async (oldPassword: string, newPassword: string) => {
  try {
    const response = await axiosInstance.post('auth/change-password', {
      oldPassword,
      newPassword
    })
    return response.data
  } catch (error: any) {
    throw error
  }
}

// Verify token
export const verifyToken = async () => {
  try {
    const response = await axiosInstance.get('auth/verify')
    return response.data
  } catch (error: any) {
    throw error
  }
}
