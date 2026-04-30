// API helper functions for Sankalp Result Management System
// Dual-mode: Uses Firebase when configured, falls back to API routes (Prisma) otherwise
// Real-time sync enabled via onSnapshot hooks when using Firebase

import { isFirebaseConfigured } from './firebase'

// ===== Original fetch-based API (fallback when Firebase is not configured) =====
const API_BASE = '/api'

async function fetchAPI(endpoint: string, options?: RequestInit) {
  const url = `${API_BASE}${endpoint}`
  let res: Response
  try {
    res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    })
  } catch {
    throw new Error('Network error. Please check your connection.')
  }

  let data: Record<string, unknown>
  try {
    data = await res.json()
  } catch {
    throw new Error(`Server error (${res.status}). Please try again.`)
  }

  if (!data.success) {
    throw new Error((data.message as string) || 'API request failed')
  }
  return data
}

// ===== Firebase services (lazy loaded to avoid errors when not configured) =====
let firebaseServices: typeof import('./firebase-service') | null = null

async function getFirebaseServices() {
  if (!firebaseServices) {
    firebaseServices = await import('./firebase-service')
  }
  return firebaseServices
}

// ===== Auth API =====
export const authAPI = {
  login: async (username: string, password: string, role: string) => {
    if (isFirebaseConfigured) {
      const { authService } = await getFirebaseServices()
      const user = await authService.login(username, password, role)
      // Set session cookie via API route (for server-side session persistence)
      try {
        await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, role: user.role, name: user.name }),
        })
      } catch {
        // Cookie set is best-effort
      }
      return { success: true, user }
    }

    // Fallback: Use API route (Prisma)
    return fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password, role }),
    })
  },

  getSession: async () => {
    // Always check server-side session cookie
    try {
      const res = await fetch('/api/auth/session')
      const data = await res.json()
      return data
    } catch {
      return { success: false }
    }
  },

  logout: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // Cookie clear is best-effort
    }
    return { success: true }
  },

  changePassword: async (userId: string, currentPassword: string, newPassword: string) => {
    if (isFirebaseConfigured) {
      const { authService } = await getFirebaseServices()
      return await authService.changePassword(userId, currentPassword, newPassword)
    }

    // Fallback: Use API route
    return fetchAPI('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ userId, currentPassword, newPassword }),
    })
  },
}

// ===== Classes API =====
export const classesAPI = {
  getAll: async (withSubjects = false) => {
    if (isFirebaseConfigured) {
      const { classesService, subjectsService } = await getFirebaseServices()
      const classes = await classesService.getAll(withSubjects)

      if (withSubjects) {
        const allSubjects = await subjectsService.getAll()
        for (const cls of classes) {
          (cls as Record<string, unknown>).subjects = allSubjects.filter(s => s.classId === cls.id)
        }
      }

      return { success: true, classes }
    }

    // Fallback: Use API route
    const query = withSubjects ? '?withSubjects=true' : ''
    return fetchAPI(`/classes${query}`)
  },
}

// ===== Subjects API =====
export const subjectsAPI = {
  getByClass: async (classId: string) => {
    if (isFirebaseConfigured) {
      const { subjectsService } = await getFirebaseServices()
      const subjects = await subjectsService.getByClass(classId)
      return { success: true, subjects }
    }

    // Fallback: Use API route
    return fetchAPI(`/subjects?classId=${classId}`)
  },
}

// ===== Students API =====
export const studentsAPI = {
  getAll: async (classId?: string) => {
    if (isFirebaseConfigured) {
      const { studentsService, subjectsService } = await getFirebaseServices()
      const students = await studentsService.getAll(classId)

      // Get all subjects for resolving names
      const allSubjects = await subjectsService.getAll()

      // Transform to match the existing interface expected by components
      const transformed = students.map(s => ({
        id: s.id,
        rollNo: s.rollNo,
        user: { id: s.userId, username: s.username, name: s.name },
        class: { id: s.classId, name: s.className },
        studentSubjects: s.subjectIds?.map(sid => {
          const sub = allSubjects.find(as => as.id === sid)
          return {
            subjectId: sid,
            subject: { id: sid, name: sub?.name || '', classId: sub?.classId || s.classId },
          }
        }) || [],
      }))
      return { success: true, students: transformed }
    }

    // Fallback: Use API route
    const query = classId ? `?classId=${classId}` : ''
    return fetchAPI(`/students${query}`)
  },

  getById: async (id: string) => {
    if (isFirebaseConfigured) {
      const { studentsService } = await getFirebaseServices()
      const student = await studentsService.getById(id)
      if (!student) throw new Error('Student not found')
      return { success: true, student }
    }

    // Fallback: Use API route
    return fetchAPI(`/students/${id}`)
  },

  create: async (data: { username: string; password: string; name: string; classId: string; rollNo: string; subjectIds?: string[] }) => {
    if (isFirebaseConfigured) {
      const { studentsService } = await getFirebaseServices()
      const student = await studentsService.create(data)
      return { success: true, student }
    }

    // Fallback: Use API route
    return fetchAPI('/students', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  update: async (id: string, data: { name?: string; classId?: string; rollNo?: string; subjectIds?: string[] }) => {
    if (isFirebaseConfigured) {
      const { studentsService } = await getFirebaseServices()
      const student = await studentsService.update(id, data)
      return { success: true, student }
    }

    // Fallback: Use API route
    return fetchAPI(`/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  delete: async (id: string) => {
    if (isFirebaseConfigured) {
      const { studentsService } = await getFirebaseServices()
      await studentsService.delete(id)
      return { success: true }
    }

    // Fallback: Use API route
    return fetchAPI(`/students/${id}`, { method: 'DELETE' })
  },
}

// ===== Teachers API =====
export const teachersAPI = {
  getAll: async () => {
    if (isFirebaseConfigured) {
      const { teachersService } = await getFirebaseServices()
      const teachers = await teachersService.getAll()
      return { success: true, teachers }
    }

    // Fallback: Use API route
    return fetchAPI('/teachers')
  },

  getById: async (id: string) => {
    if (isFirebaseConfigured) {
      const { teachersService } = await getFirebaseServices()
      const teacher = await teachersService.getById(id)
      if (!teacher) throw new Error('Teacher not found')
      return { success: true, teacher }
    }

    // Fallback: Use API route
    return fetchAPI(`/teachers/${id}`)
  },

  create: async (data: { username: string; password: string; name: string; subjects: { classId: string; subjectId: string }[] }) => {
    if (isFirebaseConfigured) {
      const { teachersService } = await getFirebaseServices()
      const teacher = await teachersService.create(data)
      return { success: true, teacher }
    }

    // Fallback: Use API route
    return fetchAPI('/teachers', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  update: async (id: string, data: { name?: string; subjects?: { classId: string; subjectId: string }[] }) => {
    if (isFirebaseConfigured) {
      const { teachersService } = await getFirebaseServices()
      const teacher = await teachersService.update(id, data)
      return { success: true, teacher }
    }

    // Fallback: Use API route
    return fetchAPI(`/teachers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  delete: async (id: string) => {
    if (isFirebaseConfigured) {
      const { teachersService } = await getFirebaseServices()
      await teachersService.delete(id)
      return { success: true }
    }

    // Fallback: Use API route
    return fetchAPI(`/teachers/${id}`, { method: 'DELETE' })
  },
}

// ===== Tests API =====
export const testsAPI = {
  getAll: async (filters?: { classId?: string; teacherId?: string }) => {
    if (isFirebaseConfigured) {
      const { testsService } = await getFirebaseServices()
      const tests = await testsService.getAll(filters)
      return { success: true, tests }
    }

    // Fallback: Use API route
    const params = new URLSearchParams()
    if (filters?.classId) params.set('classId', filters.classId)
    if (filters?.teacherId) params.set('teacherId', filters.teacherId)
    const query = params.toString() ? `?${params.toString()}` : ''
    return fetchAPI(`/tests${query}`)
  },

  getById: async (id: string) => {
    if (isFirebaseConfigured) {
      const { testsService } = await getFirebaseServices()
      const test = await testsService.getById(id)
      if (!test) throw new Error('Test not found')
      return { success: true, test }
    }

    // Fallback: Use API route
    return fetchAPI(`/tests/${id}`)
  },

  create: async (data: { name: string; classId: string; subjectId: string; teacherId: string; date: string; maxMarks: number }) => {
    if (isFirebaseConfigured) {
      const { testsService } = await getFirebaseServices()
      const test = await testsService.create(data)
      return { success: true, test }
    }

    // Fallback: Use API route
    return fetchAPI('/tests', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  update: async (id: string, data: { name?: string; classId?: string; subjectId?: string; teacherId?: string; date?: string; maxMarks?: number }) => {
    if (isFirebaseConfigured) {
      throw new Error('Test update not implemented in Firebase mode')
    }

    // Fallback: Use API route
    return fetchAPI(`/tests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  delete: async (id: string) => {
    if (isFirebaseConfigured) {
      const { testsService } = await getFirebaseServices()
      await testsService.delete(id)
      return { success: true }
    }

    // Fallback: Use API route
    return fetchAPI(`/tests/${id}`, { method: 'DELETE' })
  },
}

// ===== Marks API =====
export const marksAPI = {
  getByTest: async (testId: string) => {
    if (isFirebaseConfigured) {
      const { marksService } = await getFirebaseServices()
      const marks = await marksService.getByTest(testId)
      return { success: true, marks }
    }

    // Fallback: Use API route
    return fetchAPI(`/marks?testId=${testId}`)
  },

  getByStudent: async (studentId: string) => {
    if (isFirebaseConfigured) {
      const { marksService } = await getFirebaseServices()
      const marks = await marksService.getByStudent(studentId)
      return { success: true, marks }
    }

    // Fallback: Use API route
    return fetchAPI(`/marks?studentId=${studentId}`)
  },

  create: async (testId: string, entries: { studentId: string; marks: number }[]) => {
    if (isFirebaseConfigured) {
      const { marksService } = await getFirebaseServices()
      const marks = await marksService.create(testId, entries)
      return { success: true, marks, count: marks.length }
    }

    // Fallback: Use API route
    return fetchAPI('/marks', {
      method: 'POST',
      body: JSON.stringify({ testId, entries }),
    })
  },
}

// ===== Results API =====
export const resultsAPI = {
  getClassResults: async (classId: string) => {
    if (isFirebaseConfigured) {
      const { resultsService } = await getFirebaseServices()
      return await resultsService.getClassResults(classId)
    }

    // Fallback: Use API route
    return fetchAPI(`/results/class/${classId}`)
  },

  getStudentResults: async (studentId: string) => {
    if (isFirebaseConfigured) {
      const { resultsService } = await getFirebaseServices()
      return await resultsService.getStudentResults(studentId)
    }

    // Fallback: Use API route
    return fetchAPI(`/results/student/${studentId}`)
  },
}

// ===== Reports API =====
export const reportsAPI = {
  getStudentReport: async (studentId: string, dateRange?: { fromDate?: string; toDate?: string }) => {
    if (isFirebaseConfigured) {
      const { reportsService } = await getFirebaseServices()
      const report = await reportsService.getStudentReport(studentId, dateRange)
      return { success: true, report }
    }

    // Fallback: Use API route
    const params = new URLSearchParams()
    if (dateRange?.fromDate) params.set('fromDate', dateRange.fromDate)
    if (dateRange?.toDate) params.set('toDate', dateRange.toDate)
    const query = params.toString() ? `?${params.toString()}` : ''
    return fetchAPI(`/reports/student/${studentId}${query}`)
  },

  getClassReport: async (classId: string, dateRange?: { fromDate?: string; toDate?: string }) => {
    if (isFirebaseConfigured) {
      const { reportsService } = await getFirebaseServices()
      const report = await reportsService.getClassReport(classId, dateRange)
      return { success: true, report }
    }

    // Fallback: Use API route
    const params = new URLSearchParams()
    if (dateRange?.fromDate) params.set('fromDate', dateRange.fromDate)
    if (dateRange?.toDate) params.set('toDate', dateRange.toDate)
    const query = params.toString() ? `?${params.toString()}` : ''
    return fetchAPI(`/reports/class/${classId}${query}`)
  },

  getSubjectReport: async (subjectId: string, dateRange?: { fromDate?: string; toDate?: string }) => {
    if (isFirebaseConfigured) {
      const { reportsService } = await getFirebaseServices()
      const report = await reportsService.getSubjectReport(subjectId, dateRange)
      return { success: true, report }
    }

    // Fallback: Use API route
    const params = new URLSearchParams()
    if (dateRange?.fromDate) params.set('fromDate', dateRange.fromDate)
    if (dateRange?.toDate) params.set('toDate', dateRange.toDate)
    const query = params.toString() ? `?${params.toString()}` : ''
    return fetchAPI(`/reports/subject/${subjectId}${query}`)
  },
}

// ===== Real-Time Sync =====
// Only available when Firebase is configured
// Use getRealtimeService() to access real-time functionality
export async function getRealtimeService() {
  if (!isFirebaseConfigured) return null
  const { realtimeService } = await getFirebaseServices()
  return realtimeService
}

// Re-export Firebase types for real-time hooks
export type { Unsubscribe } from 'firebase/firestore'
export type { StudentDoc, TeacherDoc, TestDoc, ClassDoc, SubjectDoc, MarksDoc } from './firebase-service'
