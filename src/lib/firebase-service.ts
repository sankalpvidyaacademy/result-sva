// Firebase Firestore Service Layer for Sankalp Result Management System
// Replaces Prisma/SQLite with Firebase Firestore
// All business logic is preserved exactly as in the original API routes

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { firestore } from './firebase'

// ===== Types =====
export interface UserDoc {
  id: string
  username: string
  password: string
  role: string // ADMIN, TEACHER, STUDENT
  name: string
  createdAt: unknown
  updatedAt: unknown
}

export interface ClassDoc {
  id: string
  name: string
  createdAt: unknown
}

export interface SubjectDoc {
  id: string
  name: string
  classId: string
  className: string
  createdAt: unknown
}

export interface StudentDoc {
  id: string
  userId: string
  username: string
  name: string
  classId: string
  className: string
  rollNo: string
  subjectIds: string[]
  createdAt: unknown
}

export interface TeacherDoc {
  id: string
  userId: string
  username: string
  name: string
  subjects: {
    id: string
    subjectId: string
    subjectName: string
    classId: string
    className: string
  }[]
  createdAt: unknown
}

export interface TestDoc {
  id: string
  name: string
  classId: string
  className: string
  subjectId: string
  subjectName: string
  teacherId: string
  teacherName: string
  date: string
  maxMarks: number
  createdAt: unknown
}

export interface MarksDoc {
  id: string
  testId: string
  studentId: string
  studentName: string
  studentRollNo: string
  marks: number
  testInfo: {
    name: string
    date: string
    maxMarks: number
    subjectId: string
    subjectName: string
    classId: string
    className: string
  }
  createdAt: unknown
}

// ===== Helper: Convert Firestore doc to typed object =====
function docToObj<T extends Record<string, unknown>>(snap: { id: string; data: () => Record<string, unknown> | undefined }): T & { id: string } {
  const data = snap.data()
  return { id: snap.id, ...data } as T & { id: string }
}

// ===== AUTH SERVICE =====
export const authService = {
  login: async (username: string, password: string, role: string) => {
    const q = query(collection(firestore, 'users'), where('username', '==', username))
    const snap = await getDocs(q)

    if (snap.empty) {
      throw new Error('Invalid credentials')
    }

    const user = docToObj<UserDoc>(snap.docs[0])

    if (user.password !== password || user.role !== role) {
      throw new Error('Invalid credentials')
    }

    return {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
    }
  },

  getUserById: async (userId: string) => {
    const snap = await getDoc(doc(firestore, 'users', userId))
    if (!snap.exists()) return null
    return docToObj<UserDoc>(snap)
  },

  changePassword: async (userId: string, currentPassword: string, newPassword: string) => {
    const snap = await getDoc(doc(firestore, 'users', userId))
    if (!snap.exists()) {
      throw new Error('User not found')
    }
    const user = docToObj<UserDoc>(snap)

    if (user.password !== currentPassword) {
      throw new Error('Current password is incorrect')
    }

    await updateDoc(doc(firestore, 'users', userId), {
      password: newPassword,
      updatedAt: serverTimestamp(),
    })

    return { success: true }
  },
}

// ===== CLASSES SERVICE =====
export const classesService = {
  getAll: async (withSubjects = false) => {
    const q = query(collection(firestore, 'classes'), orderBy('name'))
    const snap = await getDocs(q)
    const classes = snap.docs.map(d => docToObj<ClassDoc>(d))

    if (withSubjects) {
      // Get all subjects
      const subjectsSnap = await getDocs(query(collection(firestore, 'subjects'), orderBy('name')))
      const allSubjects = subjectsSnap.docs.map(d => docToObj<SubjectDoc>(d))

      // Attach subjects to their classes
      for (const cls of classes) {
        (cls as ClassDoc & { subjects?: SubjectDoc[] }).subjects = allSubjects.filter(s => s.classId === cls.id)
      }
    }

    return classes
  },

  getById: async (id: string) => {
    const snap = await getDoc(doc(firestore, 'classes', id))
    if (!snap.exists()) return null
    return docToObj<ClassDoc>(snap)
  },
}

// ===== SUBJECTS SERVICE =====
export const subjectsService = {
  getByClass: async (classId?: string) => {
    let q
    if (classId) {
      q = query(collection(firestore, 'subjects'), where('classId', '==', classId))
    } else {
      q = query(collection(firestore, 'subjects'), orderBy('name'))
    }
    const snap = await getDocs(q)
    const results = snap.docs.map(d => docToObj<SubjectDoc>(d))
    if (classId) results.sort((a, b) => a.name.localeCompare(b.name))
    return results
  },

  getAll: async () => {
    const q = query(collection(firestore, 'subjects'), orderBy('name'))
    const snap = await getDocs(q)
    return snap.docs.map(d => docToObj<SubjectDoc>(d))
  },

  getById: async (id: string) => {
    const snap = await getDoc(doc(firestore, 'subjects', id))
    if (!snap.exists()) return null
    return docToObj<SubjectDoc>(snap)
  },
}

// ===== STUDENTS SERVICE =====
export const studentsService = {
  getAll: async (classId?: string) => {
    let q
    if (classId) {
      q = query(collection(firestore, 'students'), where('classId', '==', classId))
    } else {
      q = query(collection(firestore, 'students'), orderBy('rollNo'))
    }
    const snap = await getDocs(q)
    const results = snap.docs.map(d => docToObj<StudentDoc>(d))
    if (classId) results.sort((a, b) => a.rollNo.localeCompare(b.rollNo))
    return results
  },

  getById: async (id: string) => {
    const snap = await getDoc(doc(firestore, 'students', id))
    if (!snap.exists()) return null
    return docToObj<StudentDoc>(snap)
  },

  create: async (data: { username: string; password: string; name: string; classId: string; rollNo: string; subjectIds?: string[] }) => {
    // Check if username already exists
    const userQuery = query(collection(firestore, 'users'), where('username', '==', data.username))
    const userSnap = await getDocs(userQuery)
    if (!userSnap.empty) {
      throw new Error('Username already exists')
    }

    // Check if class exists
    const classSnap = await getDoc(doc(firestore, 'classes', data.classId))
    if (!classSnap.exists()) {
      throw new Error('Class not found')
    }
    const classData = docToObj<ClassDoc>(classSnap)

    // Get subject details for the selected subjects
    const subjectIds = data.subjectIds || []
    const subjects: { id: string; subjectId: string; subjectName: string; classId: string; className: string }[] = []
    for (const subjectId of subjectIds) {
      const subSnap = await getDoc(doc(firestore, 'subjects', subjectId))
      if (subSnap.exists()) {
        const sub = docToObj<SubjectDoc>(subSnap)
        subjects.push({
          id: subjectId,
          subjectId: sub.id,
          subjectName: sub.name,
          classId: sub.classId,
          className: sub.className,
        })
      }
    }

    // Create user document
    const userRef = await addDoc(collection(firestore, 'users'), {
      username: data.username,
      password: data.password,
      role: 'STUDENT',
      name: data.name,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    // Create student document (denormalized for efficient reads)
    const studentRef = await addDoc(collection(firestore, 'students'), {
      userId: userRef.id,
      username: data.username,
      name: data.name,
      classId: data.classId,
      className: classData.name,
      rollNo: data.rollNo,
      subjectIds: subjectIds,
      createdAt: serverTimestamp(),
    })

    return {
      id: studentRef.id,
      userId: userRef.id,
      username: data.username,
      name: data.name,
      classId: data.classId,
      className: classData.name,
      rollNo: data.rollNo,
      subjectIds,
      studentSubjects: subjects,
    }
  },

  update: async (id: string, data: { name?: string; classId?: string; rollNo?: string; subjectIds?: string[] }) => {
    const studentSnap = await getDoc(doc(firestore, 'students', id))
    if (!studentSnap.exists()) {
      throw new Error('Student not found')
    }
    const student = docToObj<StudentDoc>(studentSnap)

    const updateData: Record<string, unknown> = { updatedAt: serverTimestamp() }

    // Update name in both student and user docs
    if (data.name) {
      updateData.name = data.name
      await updateDoc(doc(firestore, 'users', student.userId), {
        name: data.name,
        updatedAt: serverTimestamp(),
      })
    }

    // Update class
    if (data.classId) {
      updateData.classId = data.classId
      const classSnap = await getDoc(doc(firestore, 'classes', data.classId))
      if (classSnap.exists()) {
        updateData.className = docToObj<ClassDoc>(classSnap).name
      }
    }

    // Update roll number
    if (data.rollNo) {
      updateData.rollNo = data.rollNo
    }

    // Update subject selections
    if (data.subjectIds !== undefined) {
      updateData.subjectIds = data.subjectIds
    }

    await updateDoc(doc(firestore, 'students', id), updateData)

    // Fetch updated student
    const updatedSnap = await getDoc(doc(firestore, 'students', id))
    if (!updatedSnap.exists()) {
      throw new Error('Student not found after update')
    }
    const updatedStudent = docToObj<StudentDoc>(updatedSnap)

    // Build studentSubjects for response
    const studentSubjects = []
    for (const subjectId of updatedStudent.subjectIds) {
      const subSnap = await getDoc(doc(firestore, 'subjects', subjectId))
      if (subSnap.exists()) {
        const sub = docToObj<SubjectDoc>(subSnap)
        studentSubjects.push({
          subjectId: sub.id,
          subject: { id: sub.id, name: sub.name, classId: sub.classId },
        })
      }
    }

    return {
      ...updatedStudent,
      studentSubjects,
      user: { id: student.userId, username: updatedStudent.username, name: updatedStudent.name },
      class: { id: updatedStudent.classId, name: updatedStudent.className },
    }
  },

  delete: async (id: string) => {
    const studentSnap = await getDoc(doc(firestore, 'students', id))
    if (!studentSnap.exists()) {
      throw new Error('Student not found')
    }
    const student = docToObj<StudentDoc>(studentSnap)

    // Delete marks for this student
    const marksQuery = query(collection(firestore, 'marks'), where('studentId', '==', id))
    const marksSnap = await getDocs(marksQuery)
    const batch = writeBatch(firestore)
    for (const markDoc of marksSnap.docs) {
      batch.delete(markDoc.ref)
    }
    await batch.commit()

    // Delete student doc
    await deleteDoc(doc(firestore, 'students', id))
    // Delete user doc
    await deleteDoc(doc(firestore, 'users', student.userId))

    return { success: true }
  },
}

// ===== TEACHERS SERVICE =====
export const teachersService = {
  getAll: async () => {
    const q = query(collection(firestore, 'teachers'), orderBy('name'))
    const snap = await getDocs(q)
    return snap.docs.map(d => docToObj<TeacherDoc>(d))
  },

  getById: async (id: string) => {
    const snap = await getDoc(doc(firestore, 'teachers', id))
    if (!snap.exists()) return null
    return docToObj<TeacherDoc>(snap)
  },

  create: async (data: { username: string; password: string; name: string; subjects: { classId: string; subjectId: string }[] }) => {
    // Check if username already exists
    const userQuery = query(collection(firestore, 'users'), where('username', '==', data.username))
    const userSnap = await getDocs(userQuery)
    if (!userSnap.empty) {
      throw new Error('Username already exists')
    }

    // Validate subject assignments and build subject details
    const subjectDetails: { id: string; subjectId: string; subjectName: string; classId: string; className: string }[] = []
    for (const sub of data.subjects) {
      if (!sub.classId || !sub.subjectId) {
        throw new Error('Each subject assignment must have classId and subjectId')
      }
      const subSnap = await getDoc(doc(firestore, 'subjects', sub.subjectId))
      if (!subSnap.exists()) {
        throw new Error(`Subject ${sub.subjectId} not found`)
      }
      const subData = docToObj<SubjectDoc>(subSnap)
      if (subData.classId !== sub.classId) {
        throw new Error(`Subject ${sub.subjectId} does not belong to class ${sub.classId}`)
      }
      subjectDetails.push({
        id: `${sub.subjectId}_${sub.classId}`,
        subjectId: subData.id,
        subjectName: subData.name,
        classId: subData.classId,
        className: subData.className,
      })
    }

    // Create user document
    const userRef = await addDoc(collection(firestore, 'users'), {
      username: data.username,
      password: data.password,
      role: 'TEACHER',
      name: data.name,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    // Create teacher document (denormalized)
    const teacherRef = await addDoc(collection(firestore, 'teachers'), {
      userId: userRef.id,
      username: data.username,
      name: data.name,
      subjects: subjectDetails,
      createdAt: serverTimestamp(),
    })

    return {
      id: teacherRef.id,
      userId: userRef.id,
      user: { id: userRef.id, username: data.username, name: data.name },
      subjects: subjectDetails,
    }
  },

  update: async (id: string, data: { name?: string; subjects?: { classId: string; subjectId: string }[] }) => {
    const teacherSnap = await getDoc(doc(firestore, 'teachers', id))
    if (!teacherSnap.exists()) {
      throw new Error('Teacher not found')
    }
    const teacher = docToObj<TeacherDoc>(teacherSnap)

    const updateData: Record<string, unknown> = { updatedAt: serverTimestamp() }

    // Update name
    if (data.name) {
      updateData.name = data.name
      await updateDoc(doc(firestore, 'users', teacher.userId), {
        name: data.name,
        updatedAt: serverTimestamp(),
      })
    }

    // Update subjects
    if (data.subjects && Array.isArray(data.subjects)) {
      const subjectDetails: { id: string; subjectId: string; subjectName: string; classId: string; className: string }[] = []
      for (const sub of data.subjects) {
        if (!sub.classId || !sub.subjectId) {
          throw new Error('Each subject assignment must have classId and subjectId')
        }
        const subSnap = await getDoc(doc(firestore, 'subjects', sub.subjectId))
        if (subSnap.exists()) {
          const subData = docToObj<SubjectDoc>(subSnap)
          subjectDetails.push({
            id: `${sub.subjectId}_${sub.classId}`,
            subjectId: subData.id,
            subjectName: subData.name,
            classId: subData.classId,
            className: subData.className,
          })
        }
      }
      updateData.subjects = subjectDetails
    }

    await updateDoc(doc(firestore, 'teachers', id), updateData)

    // Fetch updated teacher
    const updatedSnap = await getDoc(doc(firestore, 'teachers', id))
    if (!updatedSnap.exists()) {
      throw new Error('Teacher not found after update')
    }
    const updatedTeacher = docToObj<TeacherDoc>(updatedSnap)

    return {
      ...updatedTeacher,
      user: { id: teacher.userId, username: updatedTeacher.username, name: updatedTeacher.name },
    }
  },

  delete: async (id: string) => {
    const teacherSnap = await getDoc(doc(firestore, 'teachers', id))
    if (!teacherSnap.exists()) {
      throw new Error('Teacher not found')
    }
    const teacher = docToObj<TeacherDoc>(teacherSnap)

    // Delete tests by this teacher (and their marks)
    const testsQuery = query(collection(firestore, 'tests'), where('teacherId', '==', id))
    const testsSnap = await getDocs(testsQuery)

    const batch = writeBatch(firestore)
    for (const testDoc of testsSnap.docs) {
      // Delete marks for this test
      const marksQuery = query(collection(firestore, 'marks'), where('testId', '==', testDoc.id))
      const marksSnap = await getDocs(marksQuery)
      for (const markDoc of marksSnap.docs) {
        batch.delete(markDoc.ref)
      }
      batch.delete(testDoc.ref)
    }
    await batch.commit()

    // Delete teacher doc
    await deleteDoc(doc(firestore, 'teachers', id))
    // Delete user doc
    await deleteDoc(doc(firestore, 'users', teacher.userId))

    return { success: true }
  },
}

// ===== TESTS SERVICE =====
export const testsService = {
  getAll: async (filters?: { classId?: string; teacherId?: string }) => {
    let q
    let needsDateSort = false
    if (filters?.classId) {
      q = query(collection(firestore, 'tests'), where('classId', '==', filters.classId))
      needsDateSort = true
    } else if (filters?.teacherId) {
      q = query(collection(firestore, 'tests'), where('teacherId', '==', filters.teacherId))
      needsDateSort = true
    } else {
      q = query(collection(firestore, 'tests'), orderBy('date', 'desc'))
    }
    const snap = await getDocs(q)
    const today = new Date().toISOString().split('T')[0]

    if (needsDateSort) snap.docs.sort((a, b) => {
      const dateA = (a.data() as Record<string, unknown>).date as string
      const dateB = (b.data() as Record<string, unknown>).date as string
      return dateB.localeCompare(dateA)
    })

    return snap.docs.map(d => {
      const test = docToObj<TestDoc>(d)
      let status: string
      if (test.date === today) {
        status = 'Today'
      } else if (test.date > today) {
        status = 'Upcoming'
      } else {
        status = 'Completed'
      }
      return {
        ...test,
        status,
        subject: { id: test.subjectId, name: test.subjectName },
        class: { id: test.classId, name: test.className },
        teacher: { id: test.teacherId, name: test.teacherName },
      }
    })
  },

  getById: async (id: string) => {
    const snap = await getDoc(doc(firestore, 'tests', id))
    if (!snap.exists()) return null
    const test = docToObj<TestDoc>(snap)

    const today = new Date().toISOString().split('T')[0]
    let status: string
    if (test.date === today) {
      status = 'Today'
    } else if (test.date > today) {
      status = 'Upcoming'
    } else {
      status = 'Completed'
    }

    // Get marks for this test
    const marksQuery = query(collection(firestore, 'marks'), where('testId', '==', id))
    const marksSnap = await getDocs(marksQuery)
    const marks = marksSnap.docs.map(d => {
      const m = docToObj<MarksDoc>(d)
      return {
        id: m.id,
        marks: m.marks,
        student: {
          id: m.studentId,
          rollNo: m.studentRollNo,
          name: m.studentName,
        },
      }
    }).sort((a, b) => a.student.rollNo.localeCompare(b.student.rollNo))

    return {
      ...test,
      status,
      subject: { id: test.subjectId, name: test.subjectName },
      class: { id: test.classId, name: test.className },
      teacher: { id: test.teacherId, name: test.teacherName },
      marks,
      marksCount: marks.length,
    }
  },

  create: async (data: { name: string; classId: string; subjectId: string; teacherId: string; date: string; maxMarks: number }) => {
    // Get teacher data to validate assignment
    const teacherSnap = await getDoc(doc(firestore, 'teachers', data.teacherId))
    if (!teacherSnap.exists()) {
      throw new Error('Teacher not found')
    }
    const teacher = docToObj<TeacherDoc>(teacherSnap)

    // Check teacher is assigned to this subject
    const isAssigned = teacher.subjects.some(s => s.subjectId === data.subjectId)
    if (!isAssigned) {
      throw new Error('Teacher is not assigned to this subject')
    }

    // Get subject details
    const subjectSnap = await getDoc(doc(firestore, 'subjects', data.subjectId))
    if (!subjectSnap.exists()) {
      throw new Error('Subject not found')
    }
    const subject = docToObj<SubjectDoc>(subjectSnap)

    if (subject.classId !== data.classId) {
      throw new Error('Subject does not belong to this class')
    }

    // Validate: Only 1 test per day per class
    const existingTestQuery = query(
      collection(firestore, 'tests'),
      where('classId', '==', data.classId),
      where('date', '==', data.date)
    )
    const existingTestSnap = await getDocs(existingTestQuery)
    if (!existingTestSnap.empty) {
      throw new Error(`A test is already scheduled for this class on ${data.date}. Only 1 test per day per class is allowed.`)
    }

    // Validate: Minimum 2 days gap between tests (same class)
    const classTestsQuery = query(collection(firestore, 'tests'), where('classId', '==', data.classId))
    const classTestsSnap = await getDocs(classTestsQuery)
    const newDate = new Date(data.date)
    for (const testDoc of classTestsSnap.docs) {
      const existing = docToObj<TestDoc>(testDoc)
      const existingDate = new Date(existing.date)
      const diffDays = Math.abs(
        (newDate.getTime() - existingDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      if (diffDays <= 2) {
        throw new Error(
          `Minimum 2 days gap required between tests. Existing test "${existing.name}" on ${existing.date} is too close to ${data.date}.`
        )
      }
    }

    // Create test document (denormalized)
    const testRef = await addDoc(collection(firestore, 'tests'), {
      name: data.name,
      classId: data.classId,
      className: subject.className,
      subjectId: data.subjectId,
      subjectName: subject.name,
      teacherId: data.teacherId,
      teacherName: teacher.name,
      date: data.date,
      maxMarks: data.maxMarks,
      createdAt: serverTimestamp(),
    })

    const today = new Date().toISOString().split('T')[0]
    let status: string
    if (data.date === today) {
      status = 'Today'
    } else if (data.date > today) {
      status = 'Upcoming'
    } else {
      status = 'Completed'
    }

    return {
      id: testRef.id,
      name: data.name,
      date: data.date,
      maxMarks: data.maxMarks,
      status,
      subject: { id: data.subjectId, name: subject.name },
      class: { id: data.classId, name: subject.className },
      teacher: { id: data.teacherId, name: teacher.name },
      marksCount: 0,
    }
  },

  delete: async (id: string) => {
    const testSnap = await getDoc(doc(firestore, 'tests', id))
    if (!testSnap.exists()) {
      throw new Error('Test not found')
    }

    // Delete marks for this test
    const marksQuery = query(collection(firestore, 'marks'), where('testId', '==', id))
    const marksSnap = await getDocs(marksQuery)
    const batch = writeBatch(firestore)
    for (const markDoc of marksSnap.docs) {
      batch.delete(markDoc.ref)
    }
    batch.delete(doc(firestore, 'tests', id))
    await batch.commit()

    return { success: true }
  },
}

// ===== MARKS SERVICE =====
export const marksService = {
  getByTest: async (testId: string) => {
    const q = query(collection(firestore, 'marks'), where('testId', '==', testId))
    const snap = await getDocs(q)
    return snap.docs.map(d => {
      const m = docToObj<MarksDoc>(d)
      return {
        id: m.id,
        marks: m.marks,
        test: m.testInfo,
        student: {
          id: m.studentId,
          rollNo: m.studentRollNo,
          name: m.studentName,
          class: { id: m.testInfo.classId, name: m.testInfo.className },
        },
      }
    }).sort((a, b) => a.student.rollNo.localeCompare(b.student.rollNo))
  },

  getByStudent: async (studentId: string) => {
    const q = query(collection(firestore, 'marks'), where('studentId', '==', studentId))
    const snap = await getDocs(q)
    return snap.docs.map(d => {
      const m = docToObj<MarksDoc>(d)
      return {
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
        student: {
          id: m.studentId,
          rollNo: m.studentRollNo,
          name: m.studentName,
          class: { id: m.testInfo.classId, name: m.testInfo.className },
        },
      }
    })
  },

  create: async (testId: string, entries: { studentId: string; marks: number }[]) => {
    // Get the test to validate maxMarks
    const testSnap = await getDoc(doc(firestore, 'tests', testId))
    if (!testSnap.exists()) {
      throw new Error('Test not found')
    }
    const test = docToObj<TestDoc>(testSnap)

    // Validate all entries
    for (const entry of entries) {
      if (entry.marks > test.maxMarks) {
        throw new Error(`Marks ${entry.marks} exceed max marks ${test.maxMarks} for this test`)
      }
      if (entry.marks < 0) {
        throw new Error('Marks cannot be negative')
      }
    }

    // Get student details for denormalization
    const results = []
    const batch = writeBatch(firestore)

    for (const entry of entries) {
      const studentSnap = await getDoc(doc(firestore, 'students', entry.studentId))
      if (!studentSnap.exists()) continue
      const student = docToObj<StudentDoc>(studentSnap)

      // Check if mark already exists for this test+student
      const existingQuery = query(
        collection(firestore, 'marks'),
        where('testId', '==', testId),
        where('studentId', '==', entry.studentId)
      )
      const existingSnap = await getDocs(existingQuery)

      const markData = {
        testId,
        studentId: entry.studentId,
        studentName: student.name,
        studentRollNo: student.rollNo,
        marks: entry.marks,
        testInfo: {
          name: test.name,
          date: test.date,
          maxMarks: test.maxMarks,
          subjectId: test.subjectId,
          subjectName: test.subjectName,
          classId: test.classId,
          className: test.className,
        },
        createdAt: serverTimestamp(),
      }

      if (!existingSnap.empty) {
        // Update existing mark
        const existingDoc = existingSnap.docs[0]
        batch.update(existingDoc.ref, { marks: entry.marks, updatedAt: serverTimestamp() })
        results.push({ id: existingDoc.id, ...markData })
      } else {
        // Create new mark
        const markRef = doc(collection(firestore, 'marks'))
        batch.set(markRef, markData)
        results.push({ id: markRef.id, ...markData })
      }
    }

    await batch.commit()
    return results
  },

  update: async (id: string, marks: number) => {
    const markSnap = await getDoc(doc(firestore, 'marks', id))
    if (!markSnap.exists()) {
      throw new Error('Mark entry not found')
    }
    const mark = docToObj<MarksDoc>(markSnap)

    if (marks > mark.testInfo.maxMarks) {
      throw new Error(`Marks ${marks} exceed max marks ${mark.testInfo.maxMarks}`)
    }
    if (marks < 0) {
      throw new Error('Marks cannot be negative')
    }

    await updateDoc(doc(firestore, 'marks', id), {
      marks,
      updatedAt: serverTimestamp(),
    })

    return { success: true }
  },
}

// ===== RESULTS SERVICE =====
export const resultsService = {
  getClassResults: async (classId: string) => {
    const classSnap = await getDoc(doc(firestore, 'classes', classId))
    if (!classSnap.exists()) {
      throw new Error('Class not found')
    }
    const classData = docToObj<ClassDoc>(classSnap)

    // Get subjects for this class
    const subjectsQuery = query(collection(firestore, 'subjects'), where('classId', '==', classId))
    const subjectsSnap = await getDocs(subjectsQuery)
    const subjects = subjectsSnap.docs.map(d => docToObj<SubjectDoc>(d)).sort((a, b) => a.name.localeCompare(b.name))

    // Get completed tests for this class
    const today = new Date().toISOString().split('T')[0]
    const testsQuery = query(collection(firestore, 'tests'), where('classId', '==', classId))
    const testsSnap = await getDocs(testsQuery)
    const allTests = testsSnap.docs.map(d => docToObj<TestDoc>(d)).sort((a, b) => a.date.localeCompare(b.date))
    const tests = allTests.filter(t => t.date <= today)

    if (tests.length === 0) {
      return {
        class: { id: classData.id, name: classData.name },
        subjects,
        tests: [],
        totalMaxMarks: 0,
        students: [],
      }
    }

    const totalMaxMarks = tests.reduce((sum, t) => sum + t.maxMarks, 0)

    // Get all students in the class
    const studentsQuery = query(collection(firestore, 'students'), where('classId', '==', classId))
    const studentsSnap = await getDocs(studentsQuery)
    const students = studentsSnap.docs.map(d => docToObj<StudentDoc>(d)).sort((a, b) => a.rollNo.localeCompare(b.rollNo))

    // Get all marks for these tests
    const allMarks: MarksDoc[] = []
    for (const test of tests) {
      const marksQuery = query(collection(firestore, 'marks'), where('testId', '==', test.id))
      const marksSnap = await getDocs(marksQuery)
      for (const markDoc of marksSnap.docs) {
        allMarks.push(docToObj<MarksDoc>(markDoc))
      }
    }

    // Build result data
    const studentResults = students.map(student => {
      const subjectMarks: Record<string, { marks: number; maxMarks: number; testName: string }> = {}
      let totalMarks = 0

      for (const test of tests) {
        const markEntry = allMarks.find(m => m.testId === test.id && m.studentId === student.id)
        const obtainedMarks = markEntry ? markEntry.marks : 0
        totalMarks += obtainedMarks

        subjectMarks[test.subjectId] = {
          marks: obtainedMarks,
          maxMarks: test.maxMarks,
          testName: test.name,
        }
      }

      const percentage = totalMaxMarks > 0 ? Math.round((totalMarks / totalMaxMarks) * 100 * 100) / 100 : 0

      // Find weak subject
      let weakSubject: { subjectId: string; subjectName: string; marks: number; maxMarks: number; percentage: number } | null = null
      let lowestPercentage = Infinity

      for (const test of tests) {
        const sm = subjectMarks[test.subjectId]
        if (sm) {
          const pct = sm.maxMarks > 0 ? (sm.marks / sm.maxMarks) * 100 : 0
          if (pct < lowestPercentage) {
            lowestPercentage = pct
            weakSubject = {
              subjectId: test.subjectId,
              subjectName: test.subjectName,
              marks: sm.marks,
              maxMarks: sm.maxMarks,
              percentage: Math.round(pct * 100) / 100,
            }
          }
        }
      }

      return {
        studentId: student.id,
        rollNo: student.rollNo,
        name: student.name,
        subjectMarks,
        totalMarks,
        totalMaxMarks,
        percentage,
        weakSubject,
        testsTaken: allMarks.filter(m => m.studentId === student.id).length,
      }
    })

    // Sort by total marks for ranking
    studentResults.sort((a, b) => b.totalMarks - a.totalMarks)
    let currentRank = 1
    for (let i = 0; i < studentResults.length; i++) {
      if (i > 0 && studentResults[i].totalMarks < studentResults[i - 1].totalMarks) {
        currentRank = i + 1
      }
      studentResults[i].rank = currentRank
    }

    return {
      class: { id: classData.id, name: classData.name },
      subjects,
      tests: tests.map(t => ({
        id: t.id,
        name: t.name,
        date: t.date,
        maxMarks: t.maxMarks,
        subject: { id: t.subjectId, name: t.subjectName },
      })),
      totalMaxMarks,
      students: studentResults,
    }
  },

  getStudentResults: async (studentId: string) => {
    const studentSnap = await getDoc(doc(firestore, 'students', studentId))
    if (!studentSnap.exists()) {
      throw new Error('Student not found')
    }
    const student = docToObj<StudentDoc>(studentSnap)

    // Get subjects for this class
    const subjectsQuery = query(collection(firestore, 'subjects'), where('classId', '==', student.classId))
    const subjectsSnap = await getDocs(subjectsQuery)
    const subjects = subjectsSnap.docs.map(d => docToObj<SubjectDoc>(d)).sort((a, b) => a.name.localeCompare(b.name))

    // Get completed tests for this class
    const today = new Date().toISOString().split('T')[0]
    const testsQuery = query(collection(firestore, 'tests'), where('classId', '==', student.classId))
    const testsSnap = await getDocs(testsQuery)
    const allTests = testsSnap.docs.map(d => docToObj<TestDoc>(d)).sort((a, b) => a.date.localeCompare(b.date))
    const tests = allTests.filter(t => t.date <= today)

    // Get student's marks
    const marksQuery = query(collection(firestore, 'marks'), where('studentId', '==', studentId))
    const marksSnap = await getDocs(marksQuery)
    const studentMarks = marksSnap.docs.map(d => docToObj<MarksDoc>(d))

    // Build subject-wise marks
    const subjectWise: Record<string, {
      subjectId: string; subjectName: string
      tests: { testId: string; testName: string; date: string; marks: number; maxMarks: number }[]
      totalMarks: number; totalMaxMarks: number; percentage: number
    }> = {}

    for (const subject of subjects) {
      subjectWise[subject.id] = {
        subjectId: subject.id,
        subjectName: subject.name,
        tests: [],
        totalMarks: 0,
        totalMaxMarks: 0,
        percentage: 0,
      }
    }

    let grandTotal = 0
    let grandTotalMax = 0

    const testWise: {
      testId: string; testName: string; date: string
      subjectId: string; subjectName: string
      marks: number; maxMarks: number
    }[] = []

    for (const test of tests) {
      const markEntry = studentMarks.find(m => m.testId === test.id)
      const obtainedMarks = markEntry ? markEntry.marks : 0

      testWise.push({
        testId: test.id,
        testName: test.name,
        date: test.date,
        subjectId: test.subjectId,
        subjectName: test.subjectName,
        marks: obtainedMarks,
        maxMarks: test.maxMarks,
      })

      if (subjectWise[test.subjectId]) {
        subjectWise[test.subjectId].tests.push({
          testId: test.id,
          testName: test.name,
          date: test.date,
          marks: obtainedMarks,
          maxMarks: test.maxMarks,
        })
        subjectWise[test.subjectId].totalMarks += obtainedMarks
        subjectWise[test.subjectId].totalMaxMarks += test.maxMarks
      }

      grandTotal += obtainedMarks
      grandTotalMax += test.maxMarks
    }

    // Calculate subject percentages
    let weakSubject: { subjectId: string; subjectName: string; percentage: number } | null = null
    let lowestPercentage = Infinity

    for (const key of Object.keys(subjectWise)) {
      const sw = subjectWise[key]
      sw.percentage = sw.totalMaxMarks > 0 ? Math.round((sw.totalMarks / sw.totalMaxMarks) * 100 * 100) / 100 : 0
      if (sw.totalMaxMarks > 0 && sw.percentage < lowestPercentage) {
        lowestPercentage = sw.percentage
        weakSubject = {
          subjectId: sw.subjectId,
          subjectName: sw.subjectName,
          percentage: sw.percentage,
        }
      }
    }

    const overallPercentage = grandTotalMax > 0 ? Math.round((grandTotal / grandTotalMax) * 100 * 100) / 100 : 0

    // Calculate rank in class
    const classStudentsQuery = query(collection(firestore, 'students'), where('classId', '==', student.classId))
    const classStudentsSnap = await getDocs(classStudentsQuery)
    const classStudentIds = classStudentsSnap.docs.map(d => d.id)

    // Get all marks for class students
    const classMarks: { studentId: string; marks: number }[] = []
    for (const test of tests) {
      const testMarksQuery = query(collection(firestore, 'marks'), where('testId', '==', test.id))
      const testMarksSnap = await getDocs(testMarksQuery)
      for (const markDoc of testMarksSnap.docs) {
        const m = docToObj<MarksDoc>(markDoc)
        const existing = classMarks.find(cm => cm.studentId === m.studentId)
        if (existing) {
          existing.marks += m.marks
        } else {
          classMarks.push({ studentId: m.studentId, marks: m.marks })
        }
      }
    }

    // Add students with no marks
    for (const sid of classStudentIds) {
      if (!classMarks.find(cm => cm.studentId === sid)) {
        classMarks.push({ studentId: sid, marks: 0 })
      }
    }

    classMarks.sort((a, b) => b.marks - a.marks)
    let rank = 1
    for (let i = 0; i < classMarks.length; i++) {
      if (i > 0 && classMarks[i].marks < classMarks[i - 1].marks) {
        rank = i + 1
      }
      if (classMarks[i].studentId === studentId) {
        break
      }
    }

    return {
      student: {
        id: student.id,
        name: student.name,
        username: student.username,
        rollNo: student.rollNo,
        class: { id: student.classId, name: student.className },
      },
      subjectWise: Object.values(subjectWise),
      testWise,
      totalMarks: grandTotal,
      totalMaxMarks: grandTotalMax,
      percentage: overallPercentage,
      rank,
      totalStudents: classStudentIds.length,
      weakSubject,
    }
  },
}

// ===== REPORTS SERVICE =====
const getGrade = (pct: number): string => {
  if (pct >= 90) return 'A+'
  if (pct >= 80) return 'A'
  if (pct >= 70) return 'B+'
  if (pct >= 60) return 'B'
  if (pct >= 50) return 'C'
  if (pct >= 40) return 'D'
  return 'F'
}

export const reportsService = {
  getStudentReport: async (studentId: string, dateRange?: { fromDate?: string; toDate?: string }) => {
    const studentSnap = await getDoc(doc(firestore, 'students', studentId))
    if (!studentSnap.exists()) {
      throw new Error('Student not found')
    }
    const student = docToObj<StudentDoc>(studentSnap)

    // Get subjects for this class
    const subjectsQuery = query(collection(firestore, 'subjects'), where('classId', '==', student.classId))
    const subjectsSnap = await getDocs(subjectsQuery)
    const subjects = subjectsSnap.docs.map(d => docToObj<SubjectDoc>(d)).sort((a, b) => a.name.localeCompare(b.name))

    // Get completed tests, filtered by date range
    const today = new Date().toISOString().split('T')[0]
    const testsQuery = query(collection(firestore, 'tests'), where('classId', '==', student.classId))
    const testsSnap = await getDocs(testsQuery)
    let tests = testsSnap.docs.map(d => docToObj<TestDoc>(d)).sort((a, b) => a.date.localeCompare(b.date)).filter(t => t.date <= today)

    // Apply date filter
    if (dateRange?.fromDate) {
      tests = tests.filter(t => t.date >= dateRange.fromDate!)
    }
    if (dateRange?.toDate) {
      tests = tests.filter(t => t.date <= dateRange.toDate!)
    }

    // Get student's marks
    const marksQuery = query(collection(firestore, 'marks'), where('studentId', '==', studentId))
    const marksSnap = await getDocs(marksQuery)
    const studentMarks = marksSnap.docs.map(d => docToObj<MarksDoc>(d))

    // Build subject summary
    const subjectSummary: Record<string, {
      subjectId: string; subjectName: string
      testsTaken: number; totalMarks: number; totalMaxMarks: number; percentage: number; grade: string
    }> = {}

    for (const subject of subjects) {
      subjectSummary[subject.id] = {
        subjectId: subject.id,
        subjectName: subject.name,
        testsTaken: 0,
        totalMarks: 0,
        totalMaxMarks: 0,
        percentage: 0,
        grade: '',
      }
    }

    let grandTotal = 0
    let grandTotalMax = 0

    for (const test of tests) {
      const markEntry = studentMarks.find(m => m.testId === test.id)
      const obtainedMarks = markEntry ? markEntry.marks : 0

      if (subjectSummary[test.subjectId]) {
        subjectSummary[test.subjectId].testsTaken += 1
        subjectSummary[test.subjectId].totalMarks += obtainedMarks
        subjectSummary[test.subjectId].totalMaxMarks += test.maxMarks
      }

      grandTotal += obtainedMarks
      grandTotalMax += test.maxMarks
    }

    // Calculate grades and find weak subject
    let weakSubject: { subjectId: string; subjectName: string; percentage: number } | null = null
    let lowestPercentage = Infinity

    for (const key of Object.keys(subjectSummary)) {
      const ss = subjectSummary[key]
      ss.percentage = ss.totalMaxMarks > 0 ? Math.round((ss.totalMarks / ss.totalMaxMarks) * 100 * 100) / 100 : 0
      ss.grade = getGrade(ss.percentage)
      if (ss.totalMaxMarks > 0 && ss.percentage < lowestPercentage) {
        lowestPercentage = ss.percentage
        weakSubject = {
          subjectId: ss.subjectId,
          subjectName: ss.subjectName,
          percentage: ss.percentage,
        }
      }
    }

    const overallPercentage = grandTotalMax > 0 ? Math.round((grandTotal / grandTotalMax) * 100 * 100) / 100 : 0
    const overallGrade = getGrade(overallPercentage)

    // Calculate rank in class
    const classStudentsQuery = query(collection(firestore, 'students'), where('classId', '==', student.classId))
    const classStudentsSnap = await getDocs(classStudentsQuery)

    const studentTotals: { studentId: string; name: string; totalMarks: number }[] = []
    for (const classStudentDoc of classStudentsSnap.docs) {
      const cs = docToObj<StudentDoc>(classStudentDoc)
      const csMarksQuery = query(collection(firestore, 'marks'), where('studentId', '==', cs.id))
      const csMarksSnap = await getDocs(csMarksQuery)
      const csMarks = csMarksSnap.docs.map(d => docToObj<MarksDoc>(d))

      let total = 0
      for (const test of tests) {
        const markEntry = csMarks.find(m => m.testId === test.id)
        total += markEntry ? markEntry.marks : 0
      }
      studentTotals.push({ studentId: cs.id, name: cs.name, totalMarks: total })
    }

    studentTotals.sort((a, b) => b.totalMarks - a.totalMarks)
    let rank = 1
    for (let i = 0; i < studentTotals.length; i++) {
      if (i > 0 && studentTotals[i].totalMarks < studentTotals[i - 1].totalMarks) {
        rank = i + 1
      }
      if (studentTotals[i].studentId === studentId) {
        break
      }
    }

    // Test details with marks
    const testDetails = tests.map(test => {
      const markEntry = studentMarks.find(m => m.testId === test.id)
      const obtainedMarks = markEntry ? markEntry.marks : 0
      const pct = test.maxMarks > 0 ? Math.round((obtainedMarks / test.maxMarks) * 100 * 100) / 100 : 0

      return {
        testId: test.id,
        testName: test.name,
        date: test.date,
        subject: { id: test.subjectId, name: test.subjectName },
        maxMarks: test.maxMarks,
        marksObtained: obtainedMarks,
        percentage: pct,
        grade: getGrade(pct),
      }
    })

    return {
      student: {
        id: student.id,
        name: student.name,
        username: student.username,
        rollNo: student.rollNo,
        class: { id: student.classId, name: student.className },
      },
      academicSummary: {
        totalMarks: grandTotal,
        totalMaxMarks: grandTotalMax,
        percentage: overallPercentage,
        grade: overallGrade,
        rank,
        totalStudents: classStudentsSnap.size,
        testsCompleted: tests.length,
        weakSubject,
      },
      subjectSummary: Object.values(subjectSummary),
      testDetails,
      dateRange: dateRange?.fromDate || dateRange?.toDate ? { from: dateRange?.fromDate || null, to: dateRange?.toDate || null } : null,
    }
  },

  getClassReport: async (classId: string, dateRange?: { fromDate?: string; toDate?: string }) => {
    const classSnap = await getDoc(doc(firestore, 'classes', classId))
    if (!classSnap.exists()) {
      throw new Error('Class not found')
    }
    const classData = docToObj<ClassDoc>(classSnap)

    // Get subjects
    const subjectsQuery = query(collection(firestore, 'subjects'), where('classId', '==', classId))
    const subjectsSnap = await getDocs(subjectsQuery)
    const subjects = subjectsSnap.docs.map(d => docToObj<SubjectDoc>(d)).sort((a, b) => a.name.localeCompare(b.name))

    // Get completed tests, filtered by date range
    const today = new Date().toISOString().split('T')[0]
    const testsQuery = query(collection(firestore, 'tests'), where('classId', '==', classId))
    const testsSnap = await getDocs(testsQuery)
    let tests = testsSnap.docs.map(d => docToObj<TestDoc>(d)).sort((a, b) => a.date.localeCompare(b.date)).filter(t => t.date <= today)

    if (dateRange?.fromDate) {
      tests = tests.filter(t => t.date >= dateRange.fromDate!)
    }
    if (dateRange?.toDate) {
      tests = tests.filter(t => t.date <= dateRange.toDate!)
    }

    const totalMaxMarks = tests.reduce((sum, t) => sum + t.maxMarks, 0)

    // Get all students in class
    const studentsQuery = query(collection(firestore, 'students'), where('classId', '==', classId))
    const studentsSnap = await getDocs(studentsQuery)
    const students = studentsSnap.docs.map(d => docToObj<StudentDoc>(d)).sort((a, b) => a.rollNo.localeCompare(b.rollNo))

    // Get all marks for tests
    const allMarks: MarksDoc[] = []
    for (const test of tests) {
      const marksQuery = query(collection(firestore, 'marks'), where('testId', '==', test.id))
      const marksSnap = await getDocs(marksQuery)
      for (const markDoc of marksSnap.docs) {
        allMarks.push(docToObj<MarksDoc>(markDoc))
      }
    }

    // Build student results
    const studentResults = students.map(student => {
      let totalMarks = 0
      const subjectMarks: Record<string, number> = {}
      const testMarks: Record<string, number> = {}

      for (const test of tests) {
        const markEntry = allMarks.find(m => m.testId === test.id && m.studentId === student.id)
        const obtainedMarks = markEntry ? markEntry.marks : 0
        totalMarks += obtainedMarks
        subjectMarks[test.subjectId] = (subjectMarks[test.subjectId] || 0) + obtainedMarks
        testMarks[test.id] = obtainedMarks
      }

      const percentage = totalMaxMarks > 0 ? Math.round((totalMarks / totalMaxMarks) * 100 * 100) / 100 : 0

      return {
        studentId: student.id,
        rollNo: student.rollNo,
        name: student.name,
        subjectMarks,
        testMarks,
        totalMarks,
        percentage,
      }
    })

    // Sort by total marks for ranking
    studentResults.sort((a, b) => b.totalMarks - a.totalMarks)
    let currentRank = 1
    for (let i = 0; i < studentResults.length; i++) {
      if (i > 0 && studentResults[i].totalMarks < studentResults[i - 1].totalMarks) {
        currentRank = i + 1
      }
      studentResults[i].rank = currentRank
    }

    // Class statistics
    const totalStudents = studentResults.length
    const avgPercentage = totalStudents > 0
      ? Math.round(studentResults.reduce((sum, s) => sum + s.percentage, 0) / totalStudents * 100) / 100
      : 0
    const highestMarks = studentResults.length > 0 ? studentResults[0].totalMarks : 0
    const lowestMarks = studentResults.length > 0 ? studentResults[studentResults.length - 1].totalMarks : 0

    // Subject-wise class averages
    const subjectAverages = subjects.map(subject => {
      const subjectTests = tests.filter(t => t.subjectId === subject.id)
      const subjectMax = subjectTests.reduce((sum, t) => sum + t.maxMarks, 0)

      let totalSubjectMarks = 0
      let studentsWithMarks = 0

      for (const sr of studentResults) {
        if (sr.subjectMarks[subject.id] !== undefined) {
          totalSubjectMarks += sr.subjectMarks[subject.id]
          studentsWithMarks++
        }
      }

      const avgMarks = studentsWithMarks > 0 ? Math.round((totalSubjectMarks / studentsWithMarks) * 100) / 100 : 0
      const avgPct = subjectMax > 0 && studentsWithMarks > 0
        ? Math.round((totalSubjectMarks / (studentsWithMarks * subjectMax)) * 100 * 100) / 100
        : 0

      return {
        subjectId: subject.id,
        subjectName: subject.name,
        totalTests: subjectTests.length,
        maxMarks: subjectMax,
        averageMarks: avgMarks,
        averagePercentage: avgPct,
      }
    })

    // Grade distribution
    const gradeDistribution: Record<string, number> = {}
    for (const sr of studentResults) {
      const grade = getGrade(sr.percentage)
      gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1
    }

    return {
      class: { id: classData.id, name: classData.name },
      subjects,
      tests: tests.map(t => ({
        id: t.id,
        name: t.name,
        date: t.date,
        maxMarks: t.maxMarks,
        subject: { id: t.subjectId, name: t.subjectName },
      })),
      totalMaxMarks,
      statistics: {
        totalStudents,
        totalTests: tests.length,
        averagePercentage: avgPercentage,
        highestMarks,
        lowestMarks,
        gradeDistribution,
      },
      subjectAverages,
      students: studentResults,
      dateRange: dateRange?.fromDate || dateRange?.toDate ? { from: dateRange?.fromDate || null, to: dateRange?.toDate || null } : null,
    }
  },

  getSubjectReport: async (subjectId: string, dateRange?: { fromDate?: string; toDate?: string }) => {
    const subjectSnap = await getDoc(doc(firestore, 'subjects', subjectId))
    if (!subjectSnap.exists()) {
      throw new Error('Subject not found')
    }
    const subject = docToObj<SubjectDoc>(subjectSnap)

    // Get tests for this subject, filtered by date range
    const today = new Date().toISOString().split('T')[0]
    const testsQuery = query(collection(firestore, 'tests'), where('subjectId', '==', subjectId))
    const testsSnap = await getDocs(testsQuery)
    let tests = testsSnap.docs.map(d => docToObj<TestDoc>(d)).sort((a, b) => a.date.localeCompare(b.date)).filter(t => t.date <= today)

    if (dateRange?.fromDate) {
      tests = tests.filter(t => t.date >= dateRange.fromDate!)
    }
    if (dateRange?.toDate) {
      tests = tests.filter(t => t.date <= dateRange.toDate!)
    }

    const totalMaxMarks = tests.reduce((sum, t) => sum + t.maxMarks, 0)

    // Get all students in the class
    const studentsQuery = query(collection(firestore, 'students'), where('classId', '==', subject.classId))
    const studentsSnap = await getDocs(studentsQuery)
    const students = studentsSnap.docs.map(d => docToObj<StudentDoc>(d)).sort((a, b) => a.rollNo.localeCompare(b.rollNo))

    // Get marks for all tests
    const testMarks: Record<string, MarksDoc[]> = {}
    for (const test of tests) {
      const marksQuery = query(collection(firestore, 'marks'), where('testId', '==', test.id))
      const marksSnap = await getDocs(marksQuery)
      testMarks[test.id] = marksSnap.docs.map(d => docToObj<MarksDoc>(d))
    }

    // Build per-student results
    const studentResults = students.map(student => {
      let totalMarks = 0
      const testMarksList: { testId: string; testName: string; date: string; marks: number; maxMarks: number }[] = []

      for (const test of tests) {
        const markEntry = (testMarks[test.id] || []).find(m => m.studentId === student.id)
        const obtainedMarks = markEntry ? markEntry.marks : 0
        totalMarks += obtainedMarks

        testMarksList.push({
          testId: test.id,
          testName: test.name,
          date: test.date,
          marks: obtainedMarks,
          maxMarks: test.maxMarks,
        })
      }

      const percentage = totalMaxMarks > 0 ? Math.round((totalMarks / totalMaxMarks) * 100 * 100) / 100 : 0

      return {
        studentId: student.id,
        rollNo: student.rollNo,
        name: student.name,
        totalMarks,
        totalMaxMarks,
        percentage,
        testMarks: testMarksList,
        rank: 0,
      }
    })

    // Sort by total marks for ranking
    studentResults.sort((a, b) => b.totalMarks - a.totalMarks)
    let currentRank = 1
    for (let i = 0; i < studentResults.length; i++) {
      if (i > 0 && studentResults[i].totalMarks < studentResults[i - 1].totalMarks) {
        currentRank = i + 1
      }
      studentResults[i].rank = currentRank
    }

    // Subject statistics
    const totalStudents = studentResults.length
    const avgMarks = totalStudents > 0
      ? Math.round(studentResults.reduce((sum, s) => sum + s.totalMarks, 0) / totalStudents * 100) / 100
      : 0
    const avgPercentage = totalMaxMarks > 0 && totalStudents > 0
      ? Math.round((avgMarks / totalMaxMarks) * 100 * 100) / 100
      : 0
    const highestMarks = studentResults.length > 0 ? studentResults[0].totalMarks : 0
    const lowestMarks = studentResults.length > 0 ? studentResults[studentResults.length - 1].totalMarks : 0

    // Per-test statistics
    const testStatistics = tests.map(test => {
      const marksList = (testMarks[test.id] || []).map(m => m.marks)
      const avg = marksList.length > 0
        ? Math.round(marksList.reduce((sum, m) => sum + m, 0) / marksList.length * 100) / 100
        : 0
      const highest = marksList.length > 0 ? Math.max(...marksList) : 0
      const lowest = marksList.length > 0 ? Math.min(...marksList) : 0
      const passCount = marksList.filter(m => m >= test.maxMarks * 0.4).length
      const passPercentage = marksList.length > 0
        ? Math.round((passCount / marksList.length) * 100 * 100) / 100
        : 0

      return {
        testId: test.id,
        testName: test.name,
        date: test.date,
        maxMarks: test.maxMarks,
        averageMarks: avg,
        highestMarks: highest,
        lowestMarks: lowest,
        studentsAttempted: marksList.length,
        passCount,
        passPercentage,
      }
    })

    // Grade distribution
    const gradeDistribution: Record<string, number> = {}
    for (const sr of studentResults) {
      const grade = getGrade(sr.percentage)
      gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1
    }

    return {
      subject: {
        id: subject.id,
        name: subject.name,
        class: { id: subject.classId, name: subject.className },
      },
      totalTests: tests.length,
      totalMaxMarks,
      statistics: {
        totalStudents,
        averageMarks: avgMarks,
        averagePercentage: avgPercentage,
        highestMarks,
        lowestMarks,
        gradeDistribution,
      },
      testStatistics,
      students: studentResults,
      dateRange: dateRange?.fromDate || dateRange?.toDate ? { from: dateRange?.fromDate || null, to: dateRange?.toDate || null } : null,
    }
  },
}

// ===== REAL-TIME SYNC (onSnapshot) =====
export const realtimeService = {
  // Subscribe to a collection with optional filters
  subscribeToCollection: <T>(
    collectionName: string,
    callback: (data: T[]) => void,
    filterFn?: (doc: Record<string, unknown>) => boolean
  ): Unsubscribe => {
    const q = query(collection(firestore, collectionName))
    return onSnapshot(q, (snap) => {
      let docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as T))
      if (filterFn) {
        docs = docs.filter(doc => filterFn(doc as unknown as Record<string, unknown>))
      }
      callback(docs)
    })
  },

  // Subscribe to students (optionally filtered by classId)
  subscribeToStudents: (
    callback: (data: StudentDoc[]) => void,
    classId?: string
  ): Unsubscribe => {
    let q
    if (classId) {
      q = query(collection(firestore, 'students'), where('classId', '==', classId))
    } else {
      q = query(collection(firestore, 'students'), orderBy('rollNo'))
    }
    return onSnapshot(q, (snap) => {
      const results = snap.docs.map(d => docToObj<StudentDoc>(d))
      if (classId) results.sort((a, b) => a.rollNo.localeCompare(b.rollNo))
      callback(results)
    })
  },

  // Subscribe to teachers
  subscribeToTeachers: (
    callback: (data: TeacherDoc[]) => void
  ): Unsubscribe => {
    const q = query(collection(firestore, 'teachers'), orderBy('name'))
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => docToObj<TeacherDoc>(d)))
    })
  },

  // Subscribe to tests (optionally filtered by classId or teacherId)
  subscribeToTests: (
    callback: (data: TestDoc[]) => void,
    filters?: { classId?: string; teacherId?: string }
  ): Unsubscribe => {
    let q
    if (filters?.classId) {
      q = query(collection(firestore, 'tests'), where('classId', '==', filters.classId))
    } else if (filters?.teacherId) {
      q = query(collection(firestore, 'tests'), where('teacherId', '==', filters.teacherId))
    } else {
      q = query(collection(firestore, 'tests'), orderBy('date', 'desc'))
    }
    return onSnapshot(q, (snap) => {
      const results = snap.docs.map(d => docToObj<TestDoc>(d))
      if (filters?.classId || filters?.teacherId) results.sort((a, b) => b.date.localeCompare(a.date))
      callback(results)
    })
  },

  // Subscribe to marks for a student
  subscribeToStudentMarks: (
    studentId: string,
    callback: (data: MarksDoc[]) => void
  ): Unsubscribe => {
    const q = query(collection(firestore, 'marks'), where('studentId', '==', studentId))
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => docToObj<MarksDoc>(d)))
    })
  },

  // Subscribe to marks for a test
  subscribeToTestMarks: (
    testId: string,
    callback: (data: MarksDoc[]) => void
  ): Unsubscribe => {
    const q = query(collection(firestore, 'marks'), where('testId', '==', testId))
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => docToObj<MarksDoc>(d)).sort((a, b) => a.studentRollNo.localeCompare(b.studentRollNo)))
    })
  },

  // Subscribe to classes
  subscribeToClasses: (
    callback: (data: ClassDoc[]) => void
  ): Unsubscribe => {
    const q = query(collection(firestore, 'classes'), orderBy('name'))
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => docToObj<ClassDoc>(d)))
    })
  },

  // Subscribe to subjects
  subscribeToSubjects: (
    callback: (data: SubjectDoc[]) => void,
    classId?: string
  ): Unsubscribe => {
    let q
    if (classId) {
      q = query(collection(firestore, 'subjects'), where('classId', '==', classId))
    } else {
      q = query(collection(firestore, 'subjects'), orderBy('name'))
    }
    return onSnapshot(q, (snap) => {
      const results = snap.docs.map(d => docToObj<SubjectDoc>(d))
      if (classId) results.sort((a, b) => a.name.localeCompare(b.name))
      callback(results)
    })
  },
}
