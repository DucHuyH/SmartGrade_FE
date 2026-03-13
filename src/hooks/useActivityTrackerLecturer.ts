import { logout, ping } from '../app/services/lecturer/authService'
import { useActivityTracker as useSharedActivityTracker } from './useActivityTracker'

export const useActivityTracker = () =>
  useSharedActivityTracker({
    loginPath: '/lecturer/login',
    ping,
    logout
  })