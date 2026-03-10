import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { login as lectureLogin } from '../services/lecturer/authService'

type UserRole = 'lecturer' | 'student' | null

interface User {
  id: string
  name: string
  email: string
  role: 'lecturer' | 'student'
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string, role: 'lecturer' | 'student') => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  console.log(user)

  const login = async (email: string, password: string, role: 'lecturer' | 'student'): Promise<boolean> => {
    const response = await lectureLogin(email, password)
    console.log('authContext:', response)

    if (response.success) {
      const user: User = {
        id: response.data.user.id,
        name: response.data.user.name,
        email: response.data.user.email,
        role: role
      }
      setUser(user)
      return true
    }
    return false
  }

  const logout = () => {
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
