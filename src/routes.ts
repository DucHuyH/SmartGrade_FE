import { createBrowserRouter } from 'react-router'
import { Home } from './app/pages/Home'
import { LecturerLogin } from './app/pages/lecturer/LecturerLogin'
import { StudentLogin } from './app/pages/student/StudentLogin'
import { LecturerLayout } from './app/pages/LecturerLayout'
import { StudentLayout } from './app/pages/StudentLayout'
import { LecturerDashboard } from './app/pages/lecturer/LecturerDashboard'
import { CourseManagement } from './app/pages/lecturer/CourseManagement'
import { StudentDashboard } from './app/pages/student/StudentDashboard'
import { ErrorBoundary } from './app/components/ErrorBoundary'

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Home,
    ErrorBoundary
  },
  {
    path: '/lecturer/login',
    Component: LecturerLogin
  },
  {
    path: '/student/login',
    Component: StudentLogin
  },
  {
    path: '/lecturer',
    Component: LecturerLayout,
    ErrorBoundary,
    children: [
      {
        path: 'dashboard',
        Component: LecturerDashboard
      },
      {
        path: 'courses',
        Component: CourseManagement
      }
    ]
  },
  {
    path: '/student',
    Component: StudentLayout,
    ErrorBoundary,
    children: [
      {
        path: 'dashboard',
        Component: StudentDashboard
      }
    ]
  }
])
