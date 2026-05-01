'use client'

import { useEffect, useState } from 'react'
import { isFirebaseConfigured } from './firebase'
import type { StudentDoc, TeacherDoc, TestDoc, ClassDoc, SubjectDoc, MarksDoc } from './firebase-service'
import type { Unsubscribe } from 'firebase/firestore'

// ===== Real-time data hooks using onSnapshot =====
// These hooks provide automatic data synchronization across all clients.
// Only active when Firebase is configured. Otherwise, components use manual fetch.

// Subscribe to classes with subjects
export function useRealtimeClasses(withSubjects = false) {
  const [classes, setClasses] = useState<ClassDoc[]>([])
  const [subjects, setSubjects] = useState<SubjectDoc[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false)
      return
    }

    let classUnsub: Unsubscribe
    let subjectUnsub: Unsubscribe

    const init = async () => {
      const { realtimeService } = await import('./firebase-service')

      // Subscribe to classes
      classUnsub = realtimeService.subscribeToClasses((data) => {
        setClasses(data)
        setLoading(false)
      })

      // Subscribe to subjects if needed
      if (withSubjects) {
        subjectUnsub = realtimeService.subscribeToSubjects((data) => {
          setSubjects(data)
        })
      }
    }

    init()

    return () => {
      classUnsub?.()
      subjectUnsub?.()
    }
  }, [withSubjects])

  // Attach subjects to classes if requested
  const classesWithSubjects = withSubjects
    ? classes.map(c => ({
        ...c,
        subjects: subjects.filter(s => s.classId === c.id),
      }))
    : classes

  return { classes: classesWithSubjects, subjects, loading }
}

// Subscribe to students (optionally filtered by class)
export function useRealtimeStudents(classId?: string) {
  const [students, setStudents] = useState<StudentDoc[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false)
      return
    }

    const init = async () => {
      const { realtimeService } = await import('./firebase-service')
      const unsub = realtimeService.subscribeToStudents((data) => {
        setStudents(data)
        setLoading(false)
      }, classId)

      return () => unsub()
    }

    const cleanup = init()
    return () => { cleanup.then(fn => fn?.()) }
  }, [classId])

  return { students, loading }
}

// Subscribe to teachers
export function useRealtimeTeachers() {
  const [teachers, setTeachers] = useState<TeacherDoc[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false)
      return
    }

    const init = async () => {
      const { realtimeService } = await import('./firebase-service')
      const unsub = realtimeService.subscribeToTeachers((data) => {
        setTeachers(data)
        setLoading(false)
      })

      return () => unsub()
    }

    const cleanup = init()
    return () => { cleanup.then(fn => fn?.()) }
  }, [])

  return { teachers, loading }
}

// Subscribe to tests (optionally filtered by class or teacher)
export function useRealtimeTests(filters?: { classId?: string; teacherId?: string }) {
  const [tests, setTests] = useState<TestDoc[]>([])
  const [loading, setLoading] = useState(true)

  const filterKey = `${filters?.classId || ''}-${filters?.teacherId || ''}`

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false)
      return
    }

    const currentFilters = filters
    const init = async () => {
      const { realtimeService } = await import('./firebase-service')
      const unsub = realtimeService.subscribeToTests((data) => {
        setTests(data)
        setLoading(false)
      }, currentFilters)

      return () => unsub()
    }

    const cleanup = init()
    return () => { cleanup.then(fn => fn?.()) }
    // filterKey is a stable serialized representation of filters
  }, [filterKey])

  // Add computed status to tests
  const today = new Date().toISOString().split('T')[0]
  const testsWithStatus = tests.map(t => ({
    ...t,
    status: t.date === today ? 'Today' : t.date > today ? 'Upcoming' : 'Completed',
    subject: { id: t.subjectId, name: t.subjectName },
    class: { id: t.classId, name: t.className },
    teacher: { id: t.teacherId, name: t.teacherName },
    marksCount: 0, // Will be populated on demand
  }))

  return { tests: testsWithStatus, loading }
}

// Subscribe to marks for a student
export function useRealtimeStudentMarks(studentId: string | null) {
  const [marks, setMarks] = useState<MarksDoc[]>([])
  const [loading, setLoading] = useState(!studentId)

  useEffect(() => {
    if (!isFirebaseConfigured || !studentId) return

    const init = async () => {
      const { realtimeService } = await import('./firebase-service')
      const unsub = realtimeService.subscribeToStudentMarks(studentId, (data) => {
        setMarks(data)
        setLoading(false)
      })

      return () => unsub()
    }

    const cleanup = init()
    return () => { cleanup.then(fn => fn?.()) }
  }, [studentId])

  // Transform to match existing interface
  const transformedMarks = marks.map(m => ({
    id: m.id,
    marks: m.marks,
    test: {
      id: m.testId,
      name: m.testInfo.name,
      date: m.testInfo.date,
      maxMarks: m.testInfo.maxMarks,
      subject: { id: m.testInfo.subjectId, name: m.testInfo.subjectName },
      class: { id: m.testInfo.classId, name: m.testInfo.className },
    },
  }))

  return { marks: transformedMarks, loading }
}

// Subscribe to marks for a test
export function useRealtimeTestMarks(testId: string | null) {
  const [marks, setMarks] = useState<MarksDoc[]>([])
  const [loading, setLoading] = useState(!testId)

  useEffect(() => {
    if (!isFirebaseConfigured || !testId) return

    const init = async () => {
      const { realtimeService } = await import('./firebase-service')
      const unsub = realtimeService.subscribeToTestMarks(testId, (data) => {
        setMarks(data)
        setLoading(false)
      })

      return () => unsub()
    }

    const cleanup = init()
    return () => { cleanup.then(fn => fn?.()) }
  }, [testId])

  return { marks, loading }
}
