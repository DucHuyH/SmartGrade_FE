import axiosInstance from './axios'
import { createAuthService } from '../shared/createAuthService'
import { lecturerAuthConfig } from '../shared/authConfig'

export const {
  login,
  logout,
  getCurrentUser,
  getToken,
  isAuthenticated,
  ping,
  // changePassword,
  // verifyToken
} = createAuthService(axiosInstance, lecturerAuthConfig)
