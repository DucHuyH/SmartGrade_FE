import { useRouteError, Link } from 'react-router'
import { Button } from './ui/button'

export function ErrorBoundary() {
  const error = useRouteError() as any

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50'>
      <div className='text-center space-y-4 p-8'>
        <h1 className='text-4xl font-bold text-gray-900'>Oops!</h1>
        <p className='text-gray-600'>{error?.statusText || error?.message || 'Something went wrong'}</p>
        <Link to='/'>
          <Button>Go Home</Button>
        </Link>
      </div>
    </div>
  )
}
