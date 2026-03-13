import { logout, ping } from '../app/services/student/authService'
import { useActivityTracker as useSharedActivityTracker } from './useActivityTracker'

export const useActivityTrackerStudent = () =>
    useSharedActivityTracker({
        loginPath: '/student/login',
        ping,
        logout
    })
