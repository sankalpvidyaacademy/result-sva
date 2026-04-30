// Firebase Admin Service Layer for Sankalp Result Management System
// Phase 2: All server-side write operations use Admin SDK (bypasses Firestore security rules)
// Client-side reads use Firebase Client SDK (respects security rules)

import {
  getAdminDb,
  getFieldValue,
  docToObj,
  queryToObj,
  type UserDoc,
  type ClassDoc,
  type SubjectDoc,
  type StudentDoc,
  type TeacherDoc,
  type TestDoc,
  type MarksDoc,
} from './firebase-admin'

// ===== AUTH SERVICE (Server-Side) =====
export const adminAuthService = {
  login: async (username: string, password: string, role: string) => {
    const db = await getAdminDb()
    const userSnap = await db.collection('users').where('username', '==', username).get()

    if (userSnap.empty) {
      throw new Error('Invalid credentials')
    }

    const user = docToObj<UserDoc>(userSnap.docs[0])

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

  changePassword: async (userId: string, currentPassword: string, newPassword: string) => {
    const db = await getAdminDb()
    const FieldValue = await getFieldValue()
    const userSnap = await db.collection('users').doc(userId).get()

    if (!userSnap.exists) {
      throw new Error('User not found')
    }

    const user = docToObj<UserDoc>(userSnap)

    if (user.password !== currentPassword) {
      throw new Error('Current password is incorrect')
    }

    await db.collection('users').doc(userId).update({
      password: newPassword,
      updatedAt: FieldValue.serverTimestamp(),
    })

    return { success: true }
  },
}

// ===== STUDENTS SERVICE (Server-Side) =====
export const adminStudentsService = {
  create: async (data: { username: string; password: string; name: string; classId: string; rollNo: string; subjectIds?: string[] }) => {
    const db = await getAdminDb()
    const FieldValue = await getFieldValue()

    // Check if username already exists
    const userSnap = await db.collection('users').where('username', '==', data.username).get()
    if (!userSnap.empty) {
      throw new Error('Username already exists')
    }

    // Check if class exists
    const classSnap = await db.collection('classes').doc(data.classId).get()
    if (!classSnap.exists) {
      throw new Error('Class not found')
    }
    const classData = docToObj<ClassDoc>(classSnap)

    const subjectIds = data.subjectIds || []

    // Create user document
    const userRef = await db.collection('users').add({
      username: data.username,
      password: data.password,
      role: 'STUDENT',
      name: data.name,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    // Create student document (denormalized)
    const studentRef = await db.collection('students').add({
      userId: userRef.id,
      username: data.username,
      name: data.name,
      classId: data.classId,
      className: classData.name,
      rollNo: data.rollNo,
      subjectIds,
      createdAt: FieldValue.serverTimestamp(),
    })

    // Build response
    const studentSubjects = []
    for (const subjectId of subjectIds) {
      const subSnap = await db.collection('subjects').doc(subjectId).get()
      if (subSnap.exists) {
        const sub = docToObj<SubjectDoc>(subSnap)
        studentSubjects.push({
          subjectId: sub.id,
          subject: { id: sub.id, name: sub.name, classId: sub.classId },
        })
      }
    }

    return {
      id: studentRef.id,
      userId: userRef.id,
      username: data.username,
      name: data.name,
      classId: data.classId,
      className: classData.name,
      rollNo: data.rollNo,
      subjectIds,
      studentSubjects,
      user: { id: userRef.id, username: data.username, name: data.name },
      class: { id: data.classId, name: classData.name },
    }
  },

  update: async (id: string, data: { name?: string; classId?: string; rollNo?: string; subjectIds?: string[] }) => {
    const db = await getAdminDb()
    const FieldValue = await getFieldValue()
    const studentSnap = await db.collection('students').doc(id).get()

    if (!studentSnap.exists) {
      throw new Error('Student not found')
    }
    const student = docToObj<StudentDoc>(studentSnap)

    const updateData: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() }

    // Update name in both student and user docs
    if (data.name) {
      updateData.name = data.name
      await db.collection('users').doc(student.userId).update({
        name: data.name,
        updatedAt: FieldValue.serverTimestamp(),
      })
    }

    // Update class
    if (data.classId) {
      updateData.classId = data.classId
      const classSnap = await db.collection('classes').doc(data.classId).get()
      if (classSnap.exists) {
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

    await db.collection('students').doc(id).update(updateData)

    // Fetch updated student
    const updatedSnap = await db.collection('students').doc(id).get()
    if (!updatedSnap.exists) {
      throw new Error('Student not found after update')
    }
    const updatedStudent = docToObj<StudentDoc>(updatedSnap)

    // Build studentSubjects for response
    const studentSubjects = []
    for (const subjectId of updatedStudent.subjectIds) {
      const subSnap = await db.collection('subjects').doc(subjectId).get()
      if (subSnap.exists) {
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
    const db = await getAdminDb()
    const studentSnap = await db.collection('students').doc(id).get()

    if (!studentSnap.exists) {
      throw new Error('Student not found')
    }
    const student = docToObj<StudentDoc>(studentSnap)

    // Delete marks for this student
    const marksSnap = await db.collection('marks').where('studentId', '==', id).get()
    const batch = db.batch()
    for (const markDoc of marksSnap.docs) {
      batch.delete(markDoc.ref)
    }
    await batch.commit()

    // Delete student doc
    await db.collection('students').doc(id).delete()
    // Delete user doc
    await db.collection('users').doc(student.userId).delete()

    return { success: true }
  },
}

// ===== TEACHERS SERVICE (Server-Side) =====
export const adminTeachersService = {
  create: async (data: { username: string; password: string; name: string; subjects: { classId: string; subjectId: string }[] }) => {
    const db = await getAdminDb()
    const FieldValue = await getFieldValue()

    // Check if username already exists
    const userSnap = await db.collection('users').where('username', '==', data.username).get()
    if (!userSnap.empty) {
      throw new Error('Username already exists')
    }

    // Validate subject assignments
    const subjectDetails: { id: string; subjectId: string; subjectName: string; classId: string; className: string }[] = []
    for (const sub of data.subjects) {
      if (!sub.classId || !sub.subjectId) {
        throw new Error('Each subject assignment must have classId and subjectId')
      }
      const subSnap = await db.collection('subjects').doc(sub.subjectId).get()
      if (!subSnap.exists) {
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
    const userRef = await db.collection('users').add({
      username: data.username,
      password: data.password,
      role: 'TEACHER',
      name: data.name,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    // Create teacher document (denormalized)
    const teacherRef = await db.collection('teachers').add({
      userId: userRef.id,
      username: data.username,
      name: data.name,
      subjects: subjectDetails,
      createdAt: FieldValue.serverTimestamp(),
    })

    return {
      id: teacherRef.id,
      userId: userRef.id,
      user: { id: userRef.id, username: data.username, name: data.name },
      subjects: subjectDetails,
    }
  },

  update: async (id: string, data: { name?: string; subjects?: { classId: string; subjectId: string }[] }) => {
    const db = await getAdminDb()
    const FieldValue = await getFieldValue()
    const teacherSnap = await db.collection('teachers').doc(id).get()

    if (!teacherSnap.exists) {
      throw new Error('Teacher not found')
    }
    const teacher = docToObj<TeacherDoc>(teacherSnap)

    const updateData: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() }

    // Update name
    if (data.name) {
      updateData.name = data.name
      await db.collection('users').doc(teacher.userId).update({
        name: data.name,
        updatedAt: FieldValue.serverTimestamp(),
      })
    }

    // Update subjects
    if (data.subjects && Array.isArray(data.subjects)) {
      const subjectDetails: { id: string; subjectId: string; subjectName: string; classId: string; className: string }[] = []
      for (const sub of data.subjects) {
        if (!sub.classId || !sub.subjectId) {
          throw new Error('Each subject assignment must have classId and subjectId')
        }
        const subSnap = await db.collection('subjects').doc(sub.subjectId).get()
        if (subSnap.exists) {
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

    await db.collection('teachers').doc(id).update(updateData)

    // Fetch updated teacher
    const updatedSnap = await db.collection('teachers').doc(id).get()
    if (!updatedSnap.exists) {
      throw new Error('Teacher not found after update')
    }
    const updatedTeacher = docToObj<TeacherDoc>(updatedSnap)

    return {
      ...updatedTeacher,
      user: { id: teacher.userId, username: updatedTeacher.username, name: updatedTeacher.name },
    }
  },

  delete: async (id: string) => {
    const db = await getAdminDb()
    const teacherSnap = await db.collection('teachers').doc(id).get()

    if (!teacherSnap.exists) {
      throw new Error('Teacher not found')
    }
    const teacher = docToObj<TeacherDoc>(teacherSnap)

    // Delete tests by this teacher (and their marks)
    const testsSnap = await db.collection('tests').where('teacherId', '==', id).get()

    const batch = db.batch()
    for (const testDoc of testsSnap.docs) {
      // Delete marks for this test
      const marksSnap = await db.collection('marks').where('testId', '==', testDoc.id).get()
      for (const markDoc of marksSnap.docs) {
        batch.delete(markDoc.ref)
      }
      batch.delete(testDoc.ref)
    }
    await batch.commit()

    // Delete teacher doc
    await db.collection('teachers').doc(id).delete()
    // Delete user doc
    await db.collection('users').doc(teacher.userId).delete()

    return { success: true }
  },
}

// ===== TESTS SERVICE (Server-Side) =====
export const adminTestsService = {
  create: async (data: { name: string; classId: string; subjectId: string; teacherId: string; date: string; maxMarks: number }) => {
    const db = await getAdminDb()
    const FieldValue = await getFieldValue()

    // Get teacher data to validate assignment
    const teacherSnap = await db.collection('teachers').doc(data.teacherId).get()
    if (!teacherSnap.exists) {
      throw new Error('Teacher not found')
    }
    const teacher = docToObj<TeacherDoc>(teacherSnap)

    // Check teacher is assigned to this subject
    const isAssigned = teacher.subjects.some(s => s.subjectId === data.subjectId)
    if (!isAssigned) {
      throw new Error('Teacher is not assigned to this subject')
    }

    // Get subject details
    const subjectSnap = await db.collection('subjects').doc(data.subjectId).get()
    if (!subjectSnap.exists) {
      throw new Error('Subject not found')
    }
    const subject = docToObj<SubjectDoc>(subjectSnap)

    if (subject.classId !== data.classId) {
      throw new Error('Subject does not belong to this class')
    }

    // Validate: Only 1 test per day per class
    const existingTestSnap = await db.collection('tests')
      .where('classId', '==', data.classId)
      .where('date', '==', data.date)
      .get()
    if (!existingTestSnap.empty) {
      throw new Error(`A test is already scheduled for this class on ${data.date}. Only 1 test per day per class is allowed.`)
    }

    // Validate: Minimum 2 days gap between tests (same class)
    const classTestsSnap = await db.collection('tests').where('classId', '==', data.classId).get()
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
    const testRef = await db.collection('tests').add({
      name: data.name,
      classId: data.classId,
      className: subject.className,
      subjectId: data.subjectId,
      subjectName: subject.name,
      teacherId: data.teacherId,
      teacherName: teacher.name,
      date: data.date,
      maxMarks: data.maxMarks,
      createdAt: FieldValue.serverTimestamp(),
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
    const db = await getAdminDb()
    const testSnap = await db.collection('tests').doc(id).get()

    if (!testSnap.exists) {
      throw new Error('Test not found')
    }

    // Delete marks for this test
    const marksSnap = await db.collection('marks').where('testId', '==', id).get()
    const batch = db.batch()
    for (const markDoc of marksSnap.docs) {
      batch.delete(markDoc.ref)
    }
    batch.delete(db.collection('tests').doc(id))
    await batch.commit()

    return { success: true }
  },
}

// ===== MARKS SERVICE (Server-Side) =====
export const adminMarksService = {
  create: async (testId: string, entries: { studentId: string; marks: number }[]) => {
    const db = await getAdminDb()
    const FieldValue = await getFieldValue()

    // Get the test to validate maxMarks
    const testSnap = await db.collection('tests').doc(testId).get()
    if (!testSnap.exists) {
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
    const batch = db.batch()

    for (const entry of entries) {
      const studentSnap = await db.collection('students').doc(entry.studentId).get()
      if (!studentSnap.exists) continue
      const student = docToObj<StudentDoc>(studentSnap)

      // Check if mark already exists for this test+student
      const existingSnap = await db.collection('marks')
        .where('testId', '==', testId)
        .where('studentId', '==', entry.studentId)
        .get()

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
        createdAt: FieldValue.serverTimestamp(),
      }

      if (!existingSnap.empty) {
        // Update existing mark
        const existingDoc = existingSnap.docs[0]
        batch.update(existingDoc.ref, { marks: entry.marks, updatedAt: FieldValue.serverTimestamp() })
        results.push({ id: existingDoc.id, ...markData })
      } else {
        // Create new mark
        const markRef = db.collection('marks').doc()
        batch.set(markRef, markData)
        results.push({ id: markRef.id, ...markData })
      }
    }

    await batch.commit()
    return results
  },

  update: async (id: string, marks: number) => {
    const db = await getAdminDb()
    const FieldValue = await getFieldValue()
    const markSnap = await db.collection('marks').doc(id).get()

    if (!markSnap.exists) {
      throw new Error('Mark entry not found')
    }
    const mark = docToObj<MarksDoc>(markSnap)

    if (marks > mark.testInfo.maxMarks) {
      throw new Error(`Marks ${marks} exceed max marks ${mark.testInfo.maxMarks}`)
    }
    if (marks < 0) {
      throw new Error('Marks cannot be negative')
    }

    await db.collection('marks').doc(id).update({
      marks,
      updatedAt: FieldValue.serverTimestamp(),
    })

    return { success: true }
  },
}

// ===== CLASSES SERVICE (Server-Side - for admin operations) =====
export const adminClassesService = {
  create: async (name: string) => {
    const db = await getAdminDb()
    const FieldValue = await getFieldValue()
    const docRef = await db.collection('classes').add({
      name,
      createdAt: FieldValue.serverTimestamp(),
    })
    return { id: docRef.id, name }
  },

  update: async (id: string, name: string) => {
    const db = await getAdminDb()
    await db.collection('classes').doc(id).update({ name })
    return { id, name }
  },

  delete: async (id: string) => {
    const db = await getAdminDb()
    // Delete related subjects, students, tests, marks
    const subjectsSnap = await db.collection('subjects').where('classId', '==', id).get()
    const studentsSnap = await db.collection('students').where('classId', '==', id).get()
    const testsSnap = await db.collection('tests').where('classId', '==', id).get()

    const batch = db.batch()
    for (const doc of subjectsSnap.docs) batch.delete(doc.ref)
    for (const doc of testsSnap.docs) batch.delete(doc.ref)
    // Delete marks for each test
    for (const testDoc of testsSnap.docs) {
      const marksSnap = await db.collection('marks').where('testId', '==', testDoc.id).get()
      for (const markDoc of marksSnap.docs) batch.delete(markDoc.ref)
    }
    // Delete students and their user docs
    for (const studentDoc of studentsSnap.docs) {
      const student = docToObj<StudentDoc>(studentDoc)
      batch.delete(db.collection('users').doc(student.userId))
      batch.delete(studentDoc.ref)
      // Delete marks for student
      const studentMarksSnap = await db.collection('marks').where('studentId', '==', studentDoc.id).get()
      for (const markDoc of studentMarksSnap.docs) batch.delete(markDoc.ref)
    }

    batch.delete(db.collection('classes').doc(id))
    await batch.commit()
    return { success: true }
  },
}

// ===== SUBJECTS SERVICE (Server-Side - for admin operations) =====
export const adminSubjectsService = {
  create: async (data: { name: string; classId: string }) => {
    const db = await getAdminDb()
    const FieldValue = await getFieldValue()
    const classSnap = await db.collection('classes').doc(data.classId).get()
    if (!classSnap.exists) {
      throw new Error('Class not found')
    }
    const classData = docToObj<ClassDoc>(classSnap)

    const docRef = await db.collection('subjects').add({
      name: data.name,
      classId: data.classId,
      className: classData.name,
      createdAt: FieldValue.serverTimestamp(),
    })

    return { id: docRef.id, name: data.name, classId: data.classId, className: classData.name }
  },

  update: async (id: string, data: { name?: string; classId?: string }) => {
    const db = await getAdminDb()
    const updateData: Record<string, unknown> = {}

    if (data.name) updateData.name = data.name
    if (data.classId) {
      updateData.classId = data.classId
      const classSnap = await db.collection('classes').doc(data.classId).get()
      if (classSnap.exists) {
        updateData.className = docToObj<ClassDoc>(classSnap).name
      }
    }

    await db.collection('subjects').doc(id).update(updateData)

    const updatedSnap = await db.collection('subjects').doc(id).get()
    return docToObj<SubjectDoc>(updatedSnap)
  },

  delete: async (id: string) => {
    const db = await getAdminDb()
    // Delete related tests and marks
    const testsSnap = await db.collection('tests').where('subjectId', '==', id).get()
    const batch = db.batch()
    for (const testDoc of testsSnap.docs) {
      const marksSnap = await db.collection('marks').where('testId', '==', testDoc.id).get()
      for (const markDoc of marksSnap.docs) batch.delete(markDoc.ref)
      batch.delete(testDoc.ref)
    }
    batch.delete(db.collection('subjects').doc(id))
    await batch.commit()
    return { success: true }
  },
}
