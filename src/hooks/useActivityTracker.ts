import { useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'react-toastify'

interface UseActivityTrackerOptions {
    loginPath: string
    ping: () => Promise<unknown>
    logout: () => Promise<void>
    inactivityTimeout?: number
    pingInterval?: number
}

const DEFAULT_INACTIVITY_TIMEOUT = 15 * 60 * 1000
const DEFAULT_PING_INTERVAL = 5 * 60 * 1000

export const useActivityTracker = ({
    loginPath,
    ping,
    logout,
    inactivityTimeout = DEFAULT_INACTIVITY_TIMEOUT,
    pingInterval = DEFAULT_PING_INTERVAL
}: UseActivityTrackerOptions) => {
    const navigate = useNavigate()

    const timeoutRef = useRef<number | null>(null)
    const pingIntervalRef = useRef<number | null>(null)
    const lastActivityRef = useRef<number>(Date.now())

    const handleInactivityLogout = useCallback(async () => {
        try {
            await logout()
            toast.warning('Login session has expired due to inactivity!')
        } catch (error) {
            console.error('Auto logout error:', error)
        } finally {
            navigate(loginPath)
        }
    }, [logout, navigate, loginPath])

    const checkSession = useCallback(async () => {
        try {
            const timeSinceLastActivity = Date.now() - lastActivityRef.current

            if (timeSinceLastActivity >= inactivityTimeout) {
                await handleInactivityLogout()
                return
            }

            await ping()
        } catch (error: any) {
            if (error.response?.status === 401) {
                await handleInactivityLogout()
            }
        }
    }, [ping, handleInactivityLogout, inactivityTimeout])

    const resetTimeout = useCallback(() => {
        lastActivityRef.current = Date.now()

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }

        timeoutRef.current = window.setTimeout(() => {
            handleInactivityLogout()
        }, inactivityTimeout)
    }, [handleInactivityLogout, inactivityTimeout])

    useEffect(() => {
        const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']

        const handleActivity = () => {
            resetTimeout()
        }

        activityEvents.forEach((event) => {
            document.addEventListener(event, handleActivity)
        })

        resetTimeout()
        pingIntervalRef.current = window.setInterval(() => {
            checkSession()
        }, pingInterval)

        return () => {
            activityEvents.forEach((event) => {
                document.removeEventListener(event, handleActivity)
            })

            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }

            if (pingIntervalRef.current) {
                clearInterval(pingIntervalRef.current)
            }
        }
    }, [resetTimeout, checkSession, pingInterval])

    return null
}
