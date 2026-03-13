import { Link } from 'react-router'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { GraduationCap, Users, BookOpen } from 'lucide-react'

export function Home() {
  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Header */}
      <header className='bg-white border-b border-gray-200'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
          <div className='flex items-center gap-3 justify-center'>
            <GraduationCap className='h-10 w-10 text-primary' />
            <h1 className='text-3xl'>SmartGrade</h1>
          </div>
          <p className='text-center text-gray-600 mt-2'>AI-Powered Assignment Evaluation System</p>
        </div>
      </header>

      {/* Main Content */}
      <main className='max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12'>
        <div className='text-center mb-12'>
          <h2 className='text-2xl mb-4'>Welcome to SmartGrade</h2>
          <p className='text-gray-600'>Select your role to continue</p>
        </div>

        <div className='grid md:grid-cols-2 gap-8'>
          {/* Lecturer Card */}
          <Card className='hover:shadow-lg transition-shadow'>
            <CardHeader>
              <div className='flex justify-center mb-4'>
                <div className='h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center'>
                  <Users className='h-8 w-8 text-primary' />
                </div>
              </div>
              <CardTitle className='text-center'>Lecturer Portal</CardTitle>
              <CardDescription className='text-center'>
                Manage classes, create assignments, and grade submissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to='/lecturer/login' className='block'>
                <Button className='w-full'>Continue as Lecturer</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Student Card */}
          <Card className='hover:shadow-lg transition-shadow'>
            <CardHeader>
              <div className='flex justify-center mb-4'>
                <div className='h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center'>
                  <BookOpen className='h-8 w-8 text-primary' />
                </div>
              </div>
              <CardTitle className='text-center'>Student Portal</CardTitle>
              <CardDescription className='text-center'>
                View assignments, submit work, view grades, and track your progress.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to='/student/login' className='block'>
                <Button className='w-full'>Continue as Student</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
