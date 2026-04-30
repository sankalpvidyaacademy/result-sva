// Firebase Firestore Seed Script for Sankalp Result Management System
// Run this script to populate Firestore with initial data
// Usage: bun run scripts/firebase-seed.ts

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore'

// Firebase configuration - reads from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
}

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('❌ Firebase configuration missing. Please set NEXT_PUBLIC_FIREBASE_* environment variables.')
  console.error('   Create a Firebase project at https://console.firebase.google.com')
  console.error('   Then add your config to .env file')
  process.exit(1)
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function main() {
  console.log('🌱 Seeding Firebase Firestore...')

  // ===== Create Admin User =====
  const adminQuery = query(collection(db, 'users'), where('username', '==', 'shobhit'))
  const adminSnap = await getDocs(adminQuery)
  if (adminSnap.empty) {
    await addDoc(collection(db, 'users'), {
      username: 'shobhit',
      password: 'Shobhit@1502',
      role: 'ADMIN',
      name: 'Shobhit (Admin)',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    console.log('✅ Admin user created: shobhit')
  } else {
    console.log('⏭️  Admin user already exists')
  }

  // ===== Create Classes =====
  const classNames = [
    'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8',
    'Class 9 CBSE', 'Class 10 CBSE',
    'Class 9 ICSE', 'Class 10 ICSE',
    'Class 11 Science', 'Class 12 Science',
    'Class 11 Commerce', 'Class 12 Commerce',
  ]

  const classIds: Record<string, string> = {}
  for (const name of classNames) {
    const classQuery = query(collection(db, 'classes'), where('name', '==', name))
    const classSnap = await getDocs(classQuery)
    if (classSnap.empty) {
      const docRef = await addDoc(collection(db, 'classes'), {
        name,
        createdAt: serverTimestamp(),
      })
      classIds[name] = docRef.id
      console.log(`✅ Class created: ${name}`)
    } else {
      classIds[name] = classSnap.docs[0].id
      console.log(`⏭️  Class already exists: ${name}`)
    }
  }

  // ===== Create Subjects per Class =====
  const class48Subjects = ['A-4-8 Subject', 'H-4-8 Subject', 'R-4-8 Subject', 'S-4-8 Subject']
  const class910Subjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'SST']
  const class1112ScienceSubjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology']
  const class1112CommerceSubjects = ['Accounts', 'Business Studies', 'Economics', 'English', 'Applied Mathematics']

  const subjectIds: Record<string, string> = {}
  for (const [className, classId] of Object.entries(classIds)) {
    let subjects: string[] = []
    if (className.startsWith('Class 4') || className.startsWith('Class 5') ||
        className.startsWith('Class 6') || className.startsWith('Class 7') ||
        className.startsWith('Class 8')) {
      subjects = class48Subjects
    } else if (className.includes('CBSE') || className.includes('ICSE')) {
      subjects = class910Subjects
    } else if (className.includes('Science')) {
      subjects = class1112ScienceSubjects
    } else if (className.includes('Commerce')) {
      subjects = class1112CommerceSubjects
    }

    for (const subjectName of subjects) {
      const subjectQuery = query(
        collection(db, 'subjects'),
        where('name', '==', subjectName),
        where('classId', '==', classId)
      )
      const subjectSnap = await getDocs(subjectQuery)
      if (subjectSnap.empty) {
        const docRef = await addDoc(collection(db, 'subjects'), {
          name: subjectName,
          classId,
          className,
          createdAt: serverTimestamp(),
        })
        subjectIds[`${className}_${subjectName}`] = docRef.id
        console.log(`✅ Subject created: ${subjectName} (${className})`)
      } else {
        subjectIds[`${className}_${subjectName}`] = subjectSnap.docs[0].id
        console.log(`⏭️  Subject already exists: ${subjectName} (${className})`)
      }
    }
  }

  // ===== Create Sample Teacher 1 =====
  const teacher1UserQuery = query(collection(db, 'users'), where('username', '==', 'teacher1'))
  const teacher1UserSnap = await getDocs(teacher1UserQuery)
  let teacher1UserId: string

  if (teacher1UserSnap.empty) {
    const userRef = await addDoc(collection(db, 'users'), {
      username: 'teacher1',
      password: 'teacher123',
      role: 'TEACHER',
      name: 'Rajesh Kumar',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    teacher1UserId = userRef.id
  } else {
    teacher1UserId = teacher1UserSnap.docs[0].id
  }

  const teacher1Query = query(collection(db, 'teachers'), where('userId', '==', teacher1UserId))
  const teacher1Snap = await getDocs(teacher1Query)

  if (teacher1Snap.empty) {
    const mathSubjectId = subjectIds['Class 9 CBSE_Mathematics']
    const mathSubject = mathSubjectId ? { id: `${mathSubjectId}_${classIds['Class 9 CBSE']}`, subjectId: mathSubjectId, subjectName: 'Mathematics', classId: classIds['Class 9 CBSE'], className: 'Class 9 CBSE' } : null

    await addDoc(collection(db, 'teachers'), {
      userId: teacher1UserId,
      username: 'teacher1',
      name: 'Rajesh Kumar',
      subjects: mathSubject ? [mathSubject] : [],
      createdAt: serverTimestamp(),
    })
    console.log('✅ Teacher 1 created: Rajesh Kumar (Mathematics)')
  } else {
    console.log('⏭️  Teacher 1 already exists')
  }

  // ===== Create Sample Teacher 2 =====
  const teacher2UserQuery = query(collection(db, 'users'), where('username', '==', 'teacher2'))
  const teacher2UserSnap = await getDocs(teacher2UserQuery)
  let teacher2UserId: string

  if (teacher2UserSnap.empty) {
    const userRef = await addDoc(collection(db, 'users'), {
      username: 'teacher2',
      password: 'teacher123',
      role: 'TEACHER',
      name: 'Anita Verma',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    teacher2UserId = userRef.id
  } else {
    teacher2UserId = teacher2UserSnap.docs[0].id
  }

  const teacher2Query = query(collection(db, 'teachers'), where('userId', '==', teacher2UserId))
  const teacher2Snap = await getDocs(teacher2Query)

  if (teacher2Snap.empty) {
    const physicsSubjectId = subjectIds['Class 9 CBSE_Physics']
    const physicsSubject = physicsSubjectId ? { id: `${physicsSubjectId}_${classIds['Class 9 CBSE']}`, subjectId: physicsSubjectId, subjectName: 'Physics', classId: classIds['Class 9 CBSE'], className: 'Class 9 CBSE' } : null

    await addDoc(collection(db, 'teachers'), {
      userId: teacher2UserId,
      username: 'teacher2',
      name: 'Anita Verma',
      subjects: physicsSubject ? [physicsSubject] : [],
      createdAt: serverTimestamp(),
    })
    console.log('✅ Teacher 2 created: Anita Verma (Physics)')
  } else {
    console.log('⏭️  Teacher 2 already exists')
  }

  // ===== Create Sample Students =====
  const studentNames = [
    { username: 'student1', name: 'Amit Sharma', rollNo: '001' },
    { username: 'student2', name: 'Priya Patel', rollNo: '002' },
    { username: 'student3', name: 'Rahul Singh', rollNo: '003' },
    { username: 'student4', name: 'Neha Gupta', rollNo: '004' },
    { username: 'student5', name: 'Vikram Joshi', rollNo: '005' },
  ]

  const class9CBSEId = classIds['Class 9 CBSE']
  const class9CBSESubjects = Object.entries(subjectIds)
    .filter(([key]) => key.startsWith('Class 9 CBSE_'))
    .map(([, id]) => id)

  for (const s of studentNames) {
    const studentUserQuery = query(collection(db, 'users'), where('username', '==', s.username))
    const studentUserSnap = await getDocs(studentUserQuery)

    let studentUserId: string
    if (studentUserSnap.empty) {
      const userRef = await addDoc(collection(db, 'users'), {
        username: s.username,
        password: 'student123',
        role: 'STUDENT',
        name: s.name,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      studentUserId = userRef.id
    } else {
      studentUserId = studentUserSnap.docs[0].id
    }

    const studentQuery = query(collection(db, 'students'), where('userId', '==', studentUserId))
    const studentSnap = await getDocs(studentQuery)

    if (studentSnap.empty) {
      await addDoc(collection(db, 'students'), {
        userId: studentUserId,
        username: s.username,
        name: s.name,
        classId: class9CBSEId,
        className: 'Class 9 CBSE',
        rollNo: s.rollNo,
        subjectIds: class9CBSESubjects,
        createdAt: serverTimestamp(),
      })
      console.log(`✅ Student created: ${s.name} (${s.rollNo})`)
    } else {
      console.log(`⏭️  Student already exists: ${s.name}`)
    }
  }

  console.log('🎉 Seeding complete!')
  console.log('')
  console.log('📋 Login Credentials:')
  console.log('   Admin:    shobhit / Shobhit@1502')
  console.log('   Teacher:  teacher1 / teacher123')
  console.log('   Teacher:  teacher2 / teacher123')
  console.log('   Student:  student1 / student123')
  console.log('   Student:  student2-5 / student123')
}

main()
  .catch(console.error)
