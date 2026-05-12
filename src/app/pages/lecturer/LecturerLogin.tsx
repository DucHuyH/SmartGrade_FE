import { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { GraduationCap, ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'react-toastify'
import { ForgotPasswordDialog } from '../../components/ForgotPasswordDialog'

export function LecturerLogin() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({
    username: '',
    password: ''
  })

  // Thay thế hàm handleChange cũ bằng hàm này để tránh lỗi type "any"
  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
  }
  const validate = () => {
    const newErrors = {
      username: '',
      password: ''
    }

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required'
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
    try {
      const response = await login(formData.username, formData.password, 'lecturer')
      if (response) {
        toast.success('Login successful! Welcome to Lecturer portal.')
        navigate('/lecturer/dashboard')
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Invalid username or password!'
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
            <CardTitle>Lecturer Login</CardTitle>
            <CardDescription>Enter your credentials to access the lecturer portal</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='username'>Username</Label>
                <Input
                  id='username'
                  type='text'
                  placeholder='Enter your username'
                  value={formData.username}
                  onChange={(e) => handleChange('username', e.target.value)}
                />
                {errors.username && <p className='text-sm text-red-600'>{errors.username}</p>}
              </div>
              <div className='space-y-2'>
                <Label htmlFor='password'>Password</Label>
                <Input
                  id='password'
                  type='password'
                  placeholder='Enter your password'
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                />
                {errors.password && <p className='text-sm text-red-600'>{errors.password}</p>}
              </div>
              <Button type='submit' className='w-full' disabled={loading}>
                {loading ? <Loader2 className='h-4 w-4 animate-spin text-white' /> : null}
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>

              <div className='flex justify-center'>
                <ForgotPasswordDialog role='lecturer' />
              </div>

            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
