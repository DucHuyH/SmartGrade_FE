import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { AuthRole } from '../services/shared/authConfig'
import {
    requestPasswordResetOtp as requestLecturerOtp,
    resetPassword as resetLecturerPassword,
    verifyPasswordResetOtp as verifyLecturerOtp
} from '../services/lecturer/authService'
import {
    requestPasswordResetOtp as requestStudentOtp,
    resetPassword as resetStudentPassword,
    verifyPasswordResetOtp as verifyStudentOtp
} from '../services/student/authService'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Loader2 } from 'lucide-react'
import { toast } from 'react-toastify'

type ResetStep = 'email' | 'otp' | 'password'

interface ForgotPasswordDialogProps {
    role: AuthRole
    triggerLabel?: string
}

interface ForgotPasswordFormData {
    email: string
    otp: string
    newPassword: string
    confirmPassword: string
}

interface ForgotPasswordErrors {
    email?: string
    otp?: string
    newPassword?: string
    confirmPassword?: string
    general?: string
}

const roleLabels: Record<AuthRole, string> = {
    lecturer: 'Lecturer',
    student: 'Student'
}

const apiByRole = {
    lecturer: {
        requestPasswordResetOtp: requestLecturerOtp,
        verifyPasswordResetOtp: verifyLecturerOtp,
        resetPassword: resetLecturerPassword
    },
    student: {
        requestPasswordResetOtp: requestStudentOtp,
        verifyPasswordResetOtp: verifyStudentOtp,
        resetPassword: resetStudentPassword
    }
} satisfies Record<
    AuthRole,
    {
        requestPasswordResetOtp: typeof requestLecturerOtp
        verifyPasswordResetOtp: typeof verifyLecturerOtp
        resetPassword: typeof resetLecturerPassword
    }
>

export function ForgotPasswordDialog({ role, triggerLabel = 'Forgot password?' }: ForgotPasswordDialogProps) {
    const [open, setOpen] = useState(false)
    const [step, setStep] = useState<ResetStep>('email')
    const [loading, setLoading] = useState(false)
    const [verificationToken, setVerificationToken] = useState('')
    const [formData, setFormData] = useState<ForgotPasswordFormData>({
        email: '',
        otp: '',
        newPassword: '',
        confirmPassword: ''
    })
    const [errors, setErrors] = useState<ForgotPasswordErrors>({})

    const roleLabel = useMemo(() => roleLabels[role], [role])

    const resetForm = () => {
        setStep('email')
        setLoading(false)
        setVerificationToken('')
        setFormData({
            email: '',
            otp: '',
            newPassword: '',
            confirmPassword: ''
        })
        setErrors({})
    }

    const handleOpenChange = (nextOpen: boolean) => {
        setOpen(nextOpen)
        if (!nextOpen) {
            resetForm()
        }
    }

    const handleChange = (field: keyof ForgotPasswordFormData, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
        setErrors((prev) => ({ ...prev, [field]: '', general: '' }))
    }

    const validateEmailStep = () => {
        const nextErrors: ForgotPasswordErrors = {}

        if (!formData.email.trim()) {
            nextErrors.email = 'Email is required'
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            nextErrors.email = 'Please enter a valid email address'
        }

        setErrors(nextErrors)
        return Object.values(nextErrors).every((error) => error === '')
    }

    const validateOtpStep = () => {
        const nextErrors: ForgotPasswordErrors = {}

        if (!formData.otp.trim()) {
            nextErrors.otp = 'OTP is required'
        } else if (formData.otp.trim().length < 4) {
            nextErrors.otp = 'Please enter the full OTP'
        }

        setErrors(nextErrors)
        return Object.values(nextErrors).every((error) => error === '')
    }

    const validatePasswordStep = () => {
        const nextErrors: ForgotPasswordErrors = {}

        if (!formData.newPassword) {
            nextErrors.newPassword = 'New password is required'
        } else if (formData.newPassword.length < 6) {
            nextErrors.newPassword = 'Password must be at least 6 characters'
        }

        if (!formData.confirmPassword) {
            nextErrors.confirmPassword = 'Please confirm your password'
        } else if (formData.confirmPassword !== formData.newPassword) {
            nextErrors.confirmPassword = 'Passwords do not match'
        }

        setErrors(nextErrors)
        return Object.values(nextErrors).every((error) => error === '')
    }

    const requestOtp = async () => {
        if (!validateEmailStep()) {
            return false
        }

        setLoading(true)

        try {
            await apiByRole[role].requestPasswordResetOtp({ email: formData.email })
            setStep('otp')
            toast.success(`OTP sent to ${formData.email}`)
            return true
        } catch (error: any) {
            const message = error.response?.data?.message || `Unable to send OTP for ${roleLabel.toLowerCase()}`
            setErrors({ general: message })
            toast.error(message)
            return false
        } finally {
            setLoading(false)
        }
    }

    const verifyOtp = async () => {
        if (!validateOtpStep()) {
            return false
        }

        setLoading(true)

        try {
            const response = await apiByRole[role].verifyPasswordResetOtp({
                email: formData.email,
                otp: formData.otp
            })

            const token = response?.verificationToken || response?.resetToken || response?.token || ''
            setVerificationToken(token)
            setStep('password')
            toast.success('OTP verified successfully')
            return true
        } catch (error: any) {
            const message = error.response?.data?.message || 'Invalid OTP'
            setErrors({ general: message })
            toast.error(message)
            return false
        } finally {
            setLoading(false)
        }
    }

    const completeReset = async () => {
        if (!validatePasswordStep()) {
            return false
        }

        setLoading(true)

        try {
            await apiByRole[role].resetPassword({
                email: formData.email,
                otp: formData.otp,
                newPassword: formData.newPassword,
                verificationToken: verificationToken || undefined
            })

            toast.success('Password updated. Please sign in again.')
            handleOpenChange(false)
            return true
        } catch (error: any) {
            const message = error.response?.data?.message || 'Unable to reset password'
            setErrors({ general: message })
            toast.error(message)
            return false
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        if (step === 'email') {
            await requestOtp()
            return
        }

        if (step === 'otp') {
            await verifyOtp()
            return
        }

        await completeReset()
    }

    const handleBack = () => {
        setErrors({})

        if (step === 'password') {
            setStep('otp')
            return
        }

        setStep('email')
    }

    const handleResendOtp = async () => {
        await requestOtp()
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button type='button' variant='link' className='h-auto px-0 text-sm text-primary'>
                    {triggerLabel}
                </Button>
            </DialogTrigger>
            <DialogContent className='sm:max-w-md'>
                <DialogHeader>
                    <DialogTitle>{roleLabel} Password Reset</DialogTitle>
                    <DialogDescription>
                        Enter your email, verify the OTP, then choose a new password.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className='space-y-4'>
                    <div className='rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground'>
                        {step === 'email' && 'Step 1 of 3: request a verification code.'}
                        {step === 'otp' && 'Step 2 of 3: enter the code sent to your email.'}
                        {step === 'password' && 'Step 3 of 3: set your new password.'}
                    </div>

                    {step === 'email' && (
                        <div className='space-y-2'>
                            <Label htmlFor={`${role}-reset-email`}>Email</Label>
                            <Input
                                id={`${role}-reset-email`}
                                type='email'
                                placeholder='name@university.edu'
                                value={formData.email}
                                onChange={(event) => handleChange('email', event.target.value)}
                                autoComplete='email'
                            />
                            {errors.email && <p className='text-sm text-red-600'>{errors.email}</p>}
                        </div>
                    )}

                    {step === 'otp' && (
                        <>
                            <div className='space-y-2'>
                                <Label htmlFor={`${role}-reset-email-readonly`}>Email</Label>
                                <Input id={`${role}-reset-email-readonly`} value={formData.email} disabled />
                            </div>
                            <div className='space-y-2'>
                                <Label htmlFor={`${role}-reset-otp`}>OTP</Label>
                                <Input
                                    id={`${role}-reset-otp`}
                                    type='text'
                                    inputMode='numeric'
                                    placeholder='Enter the OTP'
                                    value={formData.otp}
                                    onChange={(event) => handleChange('otp', event.target.value)}
                                    autoComplete='one-time-code'
                                />
                                {errors.otp && <p className='text-sm text-red-600'>{errors.otp}</p>}
                            </div>
                        </>
                    )}

                    {step === 'password' && (
                        <>
                            <div className='space-y-2'>
                                <Label htmlFor={`${role}-reset-password`}>New password</Label>
                                <Input
                                    id={`${role}-reset-password`}
                                    type='password'
                                    placeholder='Enter new password'
                                    value={formData.newPassword}
                                    onChange={(event) => handleChange('newPassword', event.target.value)}
                                    autoComplete='new-password'
                                />
                                {errors.newPassword && <p className='text-sm text-red-600'>{errors.newPassword}</p>}
                            </div>
                            <div className='space-y-2'>
                                <Label htmlFor={`${role}-reset-confirm-password`}>Confirm password</Label>
                                <Input
                                    id={`${role}-reset-confirm-password`}
                                    type='password'
                                    placeholder='Confirm new password'
                                    value={formData.confirmPassword}
                                    onChange={(event) => handleChange('confirmPassword', event.target.value)}
                                    autoComplete='new-password'
                                />
                                {errors.confirmPassword && <p className='text-sm text-red-600'>{errors.confirmPassword}</p>}
                            </div>
                        </>
                    )}

                    {errors.general && <p className='text-sm text-red-600'>{errors.general}</p>}

                    <div className='flex flex-col gap-2 sm:flex-row sm:justify-between'>
                        <div className='flex gap-2'>
                            {step !== 'email' && (
                                <Button type='button' variant='outline' onClick={handleBack} disabled={loading}>
                                    Back
                                </Button>
                            )}
                            {step === 'otp' && (
                                <Button type='button' variant='ghost' onClick={handleResendOtp} disabled={loading}>
                                    Resend OTP
                                </Button>
                            )}
                        </div>

                        <Button type='submit' disabled={loading}>
                            {loading ? <Loader2 className='h-4 w-4 animate-spin text-white' /> : null}
                            {loading
                                ? step === 'email'
                                    ? 'Sending...'
                                    : step === 'otp'
                                        ? 'Verifying...'
                                        : 'Resetting...'
                                : step === 'email'
                                    ? 'Send OTP'
                                    : step === 'otp'
                                        ? 'Verify OTP'
                                        : 'Reset Password'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}