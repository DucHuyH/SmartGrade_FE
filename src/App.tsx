import { RouterProvider } from 'react-router'
import { AuthProvider } from './app/contexts/AuthContext'
import { router } from './routes'
import { ToastContainer } from 'react-toastify'

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <ToastContainer
        position='top-right'
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme='light'
      />
    </AuthProvider>
  )
}
