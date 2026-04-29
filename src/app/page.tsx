'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { authAPI } from '@/lib/api'
import LoginPage from '@/components/login-page'
import AdminDashboard from '@/components/admin-dashboard'
import TeacherDashboard from '@/components/teacher-dashboard'
import StudentDashboard from '@/components/student-dashboard'

export default function Home() {
  const { user, setUser, currentPage, setCurrentPage, isLoading, setIsLoading } = useAppStore()

  // Check session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const data = await authAPI.getSession()
        if (data.success && data.user) {
          const sessionUser = {
            id: data.user.userId,
            username: '',
            role: data.user.role,
            name: data.user.name,
          }
          setUser(sessionUser)

          // Navigate to appropriate dashboard
          if (data.user.role === 'ADMIN') {
            setCurrentPage('admin-dashboard')
          } else if (data.user.role === 'TEACHER') {
            setCurrentPage('teacher-dashboard')
          } else if (data.user.role === 'STUDENT') {
            setCurrentPage('student-dashboard')
          }
        }
      } catch {
        // Not authenticated, stay on login
        setUser(null)
        setCurrentPage('login')
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()
  }, [setUser, setCurrentPage, setIsLoading])

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-emerald-50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-teal-600 to-emerald-600 mb-4 animate-pulse">
            <svg className="w-8 h-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <p className="text-slate-500">Loading...</p>
        </div>
      </div>
    )
  }

  // Render appropriate page
  if (!user || currentPage === 'login') {
    return <LoginPage />
  }

  switch (currentPage) {
    case 'admin-dashboard':
      return <AdminDashboard />
    case 'teacher-dashboard':
      return <TeacherDashboard />
    case 'student-dashboard':
      return <StudentDashboard />
    default:
      return <LoginPage />
  }
}
