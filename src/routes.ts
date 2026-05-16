import { createBrowserRouter } from 'react-router'
import { Home } from './app/pages/Home'
import { LecturerLogin } from './app/pages/lecturer/LecturerLogin'
import { StudentLogin } from './app/pages/student/StudentLogin'
import { LecturerLayout } from './app/pages/LecturerLayout'
import { StudentLayout } from './app/pages/StudentLayout'
import { LecturerDashboard } from './app/pages/lecturer/LecturerDashboard'
import { LecturerProfile } from './app/pages/lecturer/Profile'
import { CourseManagement } from './app/pages/lecturer/CourseManagement'
import { CourseAssignments } from './app/pages/lecturer/CourseAsssigments'
import { CreateAssignment } from './app/pages/lecturer/CreateAssignment'
import { EditAssignment } from './app/pages/lecturer/EditAssignment'
import { CourseStudentList } from './app/pages/lecturer/CourseStudentList'
import { SubmissionTable } from './app/pages/lecturer/SubmissionTable'
import { AIGradingReview } from './app/pages/lecturer/AIGradingReview_2'
import { FullGradebook } from './app/pages/lecturer/FullGradebook'
import { AssignmentAnalytics } from './app/pages/lecturer/AssignmentAnalytics'

import { StudentDashboard } from './app/pages/student/StudentDashboard'
import { StudentProfile } from './app/pages/student/Profile'
import { MyCourses } from './app/pages/student/MyCourses'
import { StudentAssignments } from './app/pages/student/StudentAssignments'
import { AssignmentDetail } from './app/pages/student/AssignmentDetail'
import { SubmitAssignment } from './app/pages/student/SubmitAssignment'
import { ViewGrade } from './app/pages/student/ViewGrade'
import { ErrorBoundary } from './app/components/ErrorBoundary'
import { LecturerMessages } from './app/pages/lecturer/LecturerMessages'
import { StudentMessages } from './app/pages/student/StudentMessages'
import { LecturerMessages_2 } from './app/pages/lecturer/LecturerMessages_2'
import { StudentMessages_2 } from './app/pages/student/StudentMessages_2'

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
      },
      {
        path: 'courses/:course_id/assignments',
        Component: CourseAssignments
      },
      {
        path: 'assignments/create',
        Component: CreateAssignment
      },
      {
        path: 'assignments/:assignment_id/edit',
        Component: EditAssignment
      },
      {
        path: 'courses/:course_id/students',
        Component: CourseStudentList
      },
      {
        path: 'courses/:course_id/gradebook',
        Component: FullGradebook
      },
      {
        path: 'courses/:course_id/assignments/:assignment_id/submissions',
        Component: SubmissionTable
      },
      {
        path: 'courses/:course_id/assignments/:assignment_id/submissions/:submission_id/ai-grading',
        Component: AIGradingReview
      },
      {
        path: 'courses/:course_id/assignments/:assignment_id/analytics',
        Component: AssignmentAnalytics
      },
      {
        path: 'messages',
        Component: LecturerMessages
      },
      {
        path: 'messages-v2',
        Component: LecturerMessages_2
      },
      {
        path: 'profile',
        Component: LecturerProfile
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
      },
      {
        path: 'courses',
        Component: MyCourses
      },
      {
        path: 'courses/:course_id/assignments',
        Component: StudentAssignments
      },
      {
        path: 'courses/:course_id/assignments/:assignment_id',
        Component: AssignmentDetail
      },
      {
        path: 'submit/:assignment_id',
        Component: SubmitAssignment
      },
      {
        path: 'submissions/:submission_id/grade',
        Component: ViewGrade
      },
      {
        path: 'messages',
        Component: StudentMessages
      },
      {
        path: 'messages-v2',
        Component: StudentMessages_2
      },
      {
        path: 'profile',
        Component: StudentProfile
      }

    ]
  }
])
