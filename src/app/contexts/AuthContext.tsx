import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

type UserRole = 'lecturer' | 'student' | null

interface User {
  id: string
  name: string
  email: string
  role: 'lecturer' | 'student'
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string, role: 'lecturer' | 'student') => boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  const login = (email: string, password: string, role: 'lecturer' | 'student') => {
    // Mock authentication
    if (email && password) {
      const mockUser: User = {
        id: role === 'lecturer' ? 'L001' : 'S001',
        name: role === 'lecturer' ? 'Dr. Sarah Johnson' : 'Alex Martinez',
        email: email,
        role: role
      }
      setUser(mockUser)
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
