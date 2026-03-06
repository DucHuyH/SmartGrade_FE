import { createBrowserRouter } from 'react-router'
import { Home } from './app/pages/Home'
import { ErrorBoundary } from './app/components/ErrorBoundary'

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Home,
    ErrorBoundary
  }
])
