import axiosInstance from './axios'
import { createAuthService } from '../shared/createAuthService'
import { studentAuthConfig } from '../shared/authConfig'

export const {
  login,
  logout,
  getCurrentUser,
  getToken,
  isAuthenticated,
  ping,
  // changePassword,
  // verifyToken
} = createAuthService(axiosInstance, studentAuthConfig)
