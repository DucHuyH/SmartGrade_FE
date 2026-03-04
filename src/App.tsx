import { RouterProvider } from 'react-router';
import { AuthProvider } from './app/contexts/AuthContext';
import { router } from './routes';

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
