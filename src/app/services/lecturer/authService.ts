import axiosInstance from './axios'
import { createAuthService } from '../shared/createAuthService'
import { lecturerAuthConfig } from '../shared/authConfig'
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
} = createAuthService(axiosInstance, lecturerAuthConfig)

export const {
  requestPasswordResetOtp,
  verifyPasswordResetOtp,
  resetPassword
} = createPasswordResetService(axiosInstance, lecturerAuthConfig)
