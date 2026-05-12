import axiosInstance from './axios'
import { createAuthService } from '../shared/createAuthService'
import { studentAuthConfig } from '../shared/authConfig'
import { createPasswordResetService } from '../shared/passwordResetService'

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

export const {
  requestPasswordResetOtp,
  verifyPasswordResetOtp,
  resetPassword
} = createPasswordResetService(axiosInstance, studentAuthConfig)
