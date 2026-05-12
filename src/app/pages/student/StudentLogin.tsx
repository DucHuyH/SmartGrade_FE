import { useState } from 'react'
import { useNavigate, Link } from 'react-router'
// import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { GraduationCap, ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'react-toastify'
import { login } from '../../services/student/authService'
import { ForgotPasswordDialog } from '../../components/ForgotPasswordDialog'

interface LoginFormData {
  email: string
  password: string
}

interface LoginErrors {
  email?: string
  password?: string
  general?: string
}

export function StudentLogin() {
  const [loading, setLoading] = useState<boolean>(false)
  const [errors, setErrors] = useState<LoginErrors>({})
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: ''
  })

  // const { login } = useAuth();
  const navigate = useNavigate()

  const handleChange = (field: keyof LoginFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const validate = (): boolean => {
    const newErrors: LoginErrors = {}

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    setErrors(newErrors)
    return Object.values(newErrors).every((error) => error === '')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      toast.error('Please fill in all required fields correctly')
      return
    }

    setLoading(true)
    setErrors({})

    try {
      console.log('Attempting login with:', formData.email)
      const response = await login(formData.email, formData.password)
      console.log('Login response:', response)

      if (response.data.success === true) {
        navigate('/student/dashboard')
        toast.success('Login successful! Welcome to the Student portal.')
      }
    } catch (error: any) {
      console.log('Login error caught:', error)
      console.log('Error response:', error.response)
      const errorMessage = error.response?.data?.message || 'Invalid email or password'
      setErrors((prev) => ({ ...prev, general: errorMessage }))
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-gray-50 flex items-center justify-center p-4'>
      <div className='w-full max-w-md'>
        <div className='text-center mb-8'>
          <Link to='/' className='inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6'>
            <ArrowLeft className='h-4 w-4 mr-2' />
            Back to Home
          </Link>
          <div className='flex items-center gap-3 justify-center mb-4'>
            <GraduationCap className='h-10 w-10 text-primary' />
            <h1 className='text-3xl'>SmartGrade</h1>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Student Login</CardTitle>
            <CardDescription>Enter your credentials to access the student portal</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='email'>Email</Label>
                <Input
                  id='email'
                  type='email'
                  placeholder='student@university.edu'
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  required
                />
                {errors.email && <p className='text-sm text-red-600'>{errors.email}</p>}
              </div>
              <div className='space-y-2'>
                <Label htmlFor='password'>Password</Label>
                <Input
                  id='password'
                  type='password'
                  placeholder='Enter your password'
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  required
                />
                {errors.password && <p className='text-sm text-red-600'>{errors.password}</p>}
              </div>
              {errors.general && <p className='text-sm text-red-600'>{errors.general}</p>}
              <Button type='submit' className='w-full' disabled={loading}>
                {loading ? <Loader2 className='h-4 w-4 animate-spin text-white' /> : null}
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>

              <div className='flex justify-center'>
                <ForgotPasswordDialog role='student' />
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
