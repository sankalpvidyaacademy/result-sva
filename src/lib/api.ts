// API helper functions for Sankalp Result Management System
// Phase 2 Architecture (Updated):
// - ALL reads and writes go through API routes using Firebase Admin SDK
// - This is because Phase 2 Firestore rules require auth (request.auth != null)
// - The app uses custom auth (session cookies), not Firebase Auth
// - Firebase Admin SDK bypasses Firestore security rules
// - Firebase Client SDK is kept for potential future real-time features

// ===== API Route Helper =====
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

// ===== Auth API =====
export const authAPI = {
  login: async (username: string, password: string, role: string) => {
    return fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password, role }),
    })
  },

  getSession: async () => {
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
    return fetchAPI('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ userId, currentPassword, newPassword }),
    })
  },
}

// ===== Classes API =====
export const classesAPI = {
  getAll: async (withSubjects = false) => {
    const query = withSubjects ? '?withSubjects=true' : ''
    return fetchAPI(`/classes${query}`)
  },
}

// ===== Subjects API =====
export const subjectsAPI = {
  getByClass: async (classId: string) => {
    return fetchAPI(`/subjects?classId=${classId}`)
  },
}

// ===== Students API =====
export const studentsAPI = {
  getAll: async (classId?: string) => {
    const query = classId ? `?classId=${classId}` : ''
    return fetchAPI(`/students${query}`)
  },

  getById: async (id: string) => {
    return fetchAPI(`/students/${id}`)
  },

  create: async (data: { username: string; password: string; name: string; classId: string; rollNo: string; subjectIds?: string[] }) => {
    return fetchAPI('/students', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  update: async (id: string, data: { name?: string; classId?: string; rollNo?: string; subjectIds?: string[] }) => {
    return fetchAPI(`/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  delete: async (id: string) => {
    return fetchAPI(`/students/${id}`, { method: 'DELETE' })
  },
}

// ===== Teachers API =====
export const teachersAPI = {
  getAll: async () => {
    return fetchAPI('/teachers')
  },

  getById: async (id: string) => {
    return fetchAPI(`/teachers/${id}`)
  },

  create: async (data: { username: string; password: string; name: string; subjects: { classId: string; subjectId: string }[] }) => {
    return fetchAPI('/teachers', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  update: async (id: string, data: { name?: string; subjects?: { classId: string; subjectId: string }[] }) => {
    return fetchAPI(`/teachers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  delete: async (id: string) => {
    return fetchAPI(`/teachers/${id}`, { method: 'DELETE' })
  },
}

// ===== Tests API =====
export const testsAPI = {
  getAll: async (filters?: { classId?: string; teacherId?: string }) => {
    const params = new URLSearchParams()
    if (filters?.classId) params.set('classId', filters.classId)
    if (filters?.teacherId) params.set('teacherId', filters.teacherId)
    const query = params.toString() ? `?${params.toString()}` : ''
    return fetchAPI(`/tests${query}`)
  },

  getById: async (id: string) => {
    return fetchAPI(`/tests/${id}`)
  },

  create: async (data: { name: string; classId: string; subjectId: string; teacherId: string; date: string; maxMarks: number }) => {
    return fetchAPI('/tests', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  update: async (id: string, data: { name?: string; classId?: string; subjectId?: string; teacherId?: string; date?: string; maxMarks?: number }) => {
    return fetchAPI(`/tests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  delete: async (id: string) => {
    return fetchAPI(`/tests/${id}`, { method: 'DELETE' })
  },
}

// ===== Marks API =====
export const marksAPI = {
  getByTest: async (testId: string) => {
    return fetchAPI(`/marks?testId=${testId}`)
  },

  getByStudent: async (studentId: string) => {
    return fetchAPI(`/marks?studentId=${studentId}`)
  },

  create: async (testId: string, entries: { studentId: string; marks: number }[]) => {
    return fetchAPI('/marks', {
      method: 'POST',
      body: JSON.stringify({ testId, entries }),
    })
  },

  update: async (id: string, marks: number) => {
    return fetchAPI(`/marks/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ marks }),
    })
  },
}

// ===== Results API =====
export const resultsAPI = {
  getClassResults: async (classId: string) => {
    return fetchAPI(`/results/class/${classId}`)
  },

  getStudentResults: async (studentId: string) => {
    return fetchAPI(`/results/student/${studentId}`)
  },
}

// ===== Reports API =====
export const reportsAPI = {
  getStudentReport: async (studentId: string, dateRange?: { fromDate?: string; toDate?: string }) => {
    const params = new URLSearchParams()
    if (dateRange?.fromDate) params.set('fromDate', dateRange.fromDate)
    if (dateRange?.toDate) params.set('toDate', dateRange.toDate)
    const query = params.toString() ? `?${params.toString()}` : ''
    return fetchAPI(`/reports/student/${studentId}${query}`)
  },

  getClassReport: async (classId: string, dateRange?: { fromDate?: string; toDate?: string }) => {
    const params = new URLSearchParams()
    if (dateRange?.fromDate) params.set('fromDate', dateRange.fromDate)
    if (dateRange?.toDate) params.set('toDate', dateRange.toDate)
    const query = params.toString() ? `?${params.toString()}` : ''
    return fetchAPI(`/reports/class/${classId}${query}`)
  },

  getSubjectReport: async (subjectId: string, dateRange?: { fromDate?: string; toDate?: string }) => {
    const params = new URLSearchParams()
    if (dateRange?.fromDate) params.set('fromDate', dateRange.fromDate)
    if (dateRange?.toDate) params.set('toDate', dateRange.toDate)
    const query = params.toString() ? `?${params.toString()}` : ''
    return fetchAPI(`/reports/subject/${subjectId}${query}`)
  },
}
