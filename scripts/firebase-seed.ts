// Firebase Firestore Seed Script for Sankalp Result Management System
// Uses Firebase Admin SDK (bypasses security rules)
// Run this script to populate Firestore with initial data
// Usage: bun run scripts/firebase-seed.ts

import admin from 'firebase-admin'

// Firebase Admin SDK configuration using service account
const serviceAccount = {
  projectId: 'sankalp-result-system',
  clientEmail: 'firebase-adminsdk-fbsvc@sankalp-result-system.iam.gserviceaccount.com',
  privateKey: `-----BEGIN PRIVATE KEY-----
MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQCxGJU6llmjGFSq
L54w2bUsSU4Py/3NIRlRFu5+EZPxN78+7Zit6eMrETHVQgCDqnwJGTvWrSLG0Ocv
WQqrNpUu7zjtyrS2g6SCqI95WsDiJ95xfT5d72yhWsenVjPD6pUAmkSCwS3yHTpG
NRh+IZ9BqlfDyac5mn5JiDVTdellg9Wp+pIRd6X+mlnDsDP4YEHEzFgHk/a5qAsu
JeA/eO1dOe5+bfV8BZOSTstTrn4ekvWxO4EMI3GFhkY/SJmAw5G/K1Xb9Zvf1DjH
hoeWYgK//lg+hJgzWYKB7zP5jAxR4PPIao7wDWv72FWZzkSHiUCz4Jmoka1VUQre
+Ot6nX0JAgMBAAECggEANIDCwS9Q3NL6Ssg6QGZS2ZHUBEfoczekX0+KnjKM5z8t
QjVDhg/oqtx6pyxdpatWAYaLIH6M6F+Hophl2tOgT91ZRdpKUC/gBmJ9wq8erw29
22yToFq6nG2i8l/SkftKeHbD5/XorrZuj+Du5XoHUnrzcRaoLqI4XYl1scwryU3Z
pF+a0F+ZtzplergenzPw4Q0FqlV+ceMWeMuwJ/jj5OOqZGjw0AGXzyrlYKrSrJ2w
0UEp489vo4qbur4u2R0GjhgAC5dL7DzVfh+oE96/LRTxImQyl3mtEyycpIvej8z/
T01f4IYstUI3XRHJ+FNq7dybApRxaL/JLRrm6xV/dwKBgQDc+gEEK4RyvWIWaBpd
UL38E+tcWD9lSjfCMGVQpgVAP5s+9JseCW5H/cJg/g5veoBHQixc7V19m3BOjQxT
lUJv5/giz9+sroliS4PQcdrdh4k//FwW/j0FVIEW2k6LkqtmJzER63vlVUFafJpj
ewMpzAxBN2nxgZ63f3ZQ42bnawKBgQDNKiaxN2QYop7mcmDSLWhIxjErIFtxNXHZ
K11mcvwAeA7ccM4MmzM/NhhDXbgZPd6oTsqw0ZrKFoZQe8z0sY1ZvoBLxu2CvDOr
8l+x1RzjYhQNRaAsrPLYl+oxbIXiCqqcz51A4nf89s4nNAjM154gHJ/mlk4bxVh0
SauRN1wuWwKBgQC97CXJdrmMgFb4mRrnzwiqylgEc1hxbxuDTGMXsMlckg6VSliz
tTlSqLhS8qhniesM08QbTmuHFHyvFq1cfTGvyrjK+szstsofcHXnRqPsuJvvIa/o
lzTNCvc0NAdEEJg94Ttcgn9m+SKFagirrcNnPhfeSYlF57kJT4TaOshr5wKBgQCX
aE0HqbYgDBsyPCTB1yrH0iPFDOsO3/814q/aBG9/NRraihE18m9ebeB4DrjnP+aK
1SL2XKlcDEVxLfvydPm4ykLKKXNscNG9SnBev8TC9cWQidqMPdI2D96QPOONDowc
j4cgtEESmV1IRzlbWqBiWF2VAUWBbyE5KIkJ8Q4BUwKBgQDZSYOrBprdHgeC+Vnb
6L7PHf83Zl3uDwpusC99+6cAjZtjE3uKMW9l81QZIumpfqFclEPoMs6/Hceif1Zt
fFVoZ928ZUGIIAQt01tt5TssGueOfpKPPlphA++mAwT2rwRe+7CYm7SGj+cubADt
owxM/dUqRhbijo0Rzu8vEoszPA==
-----END PRIVATE KEY-----`,
}

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'sankalp-result-system',
  })
}

const db = admin.firestore()

async function main() {
  console.log('🌱 Seeding Firebase Firestore (Admin SDK)...')
  console.log('   Project: sankalp-result-system')
  console.log('')

  // ===== Create Admin User =====
  const adminQuery = await db.collection('users').where('username', '==', 'shobhit').get()
  if (adminQuery.empty) {
    await db.collection('users').add({
      username: 'shobhit',
      password: 'Shobhit@1502',
      role: 'ADMIN',
      name: 'Shobhit (Admin)',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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
    const classQuery = await db.collection('classes').where('name', '==', name).get()
    if (classQuery.empty) {
      const docRef = await db.collection('classes').add({
        name,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      classIds[name] = docRef.id
      console.log(`✅ Class created: ${name}`)
    } else {
      classIds[name] = classQuery.docs[0].id
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
      const subjectQuery = await db.collection('subjects')
        .where('name', '==', subjectName)
        .where('classId', '==', classId)
        .get()
      if (subjectQuery.empty) {
        const docRef = await db.collection('subjects').add({
          name: subjectName,
          classId,
          className,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        subjectIds[`${className}_${subjectName}`] = docRef.id
        console.log(`✅ Subject created: ${subjectName} (${className})`)
      } else {
        subjectIds[`${className}_${subjectName}`] = subjectQuery.docs[0].id
        console.log(`⏭️  Subject already exists: ${subjectName} (${className})`)
      }
    }
  }

  // ===== Create Sample Teacher 1 =====
  const teacher1UserQuery = await db.collection('users').where('username', '==', 'teacher1').get()
  let teacher1UserId: string

  if (teacher1UserQuery.empty) {
    const userRef = await db.collection('users').add({
      username: 'teacher1',
      password: 'teacher123',
      role: 'TEACHER',
      name: 'Rajesh Kumar',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
    teacher1UserId = userRef.id
  } else {
    teacher1UserId = teacher1UserQuery.docs[0].id
  }

  const teacher1Query = await db.collection('teachers').where('userId', '==', teacher1UserId).get()

  if (teacher1Query.empty) {
    const mathSubjectId = subjectIds['Class 9 CBSE_Mathematics']
    const mathSubject = mathSubjectId ? {
      id: `${mathSubjectId}_${classIds['Class 9 CBSE']}`,
      subjectId: mathSubjectId,
      subjectName: 'Mathematics',
      classId: classIds['Class 9 CBSE'],
      className: 'Class 9 CBSE'
    } : null

    await db.collection('teachers').add({
      userId: teacher1UserId,
      username: 'teacher1',
      name: 'Rajesh Kumar',
      subjects: mathSubject ? [mathSubject] : [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })
    console.log('✅ Teacher 1 created: Rajesh Kumar (Mathematics)')
  } else {
    console.log('⏭️  Teacher 1 already exists')
  }

  // ===== Create Sample Teacher 2 =====
  const teacher2UserQuery = await db.collection('users').where('username', '==', 'teacher2').get()
  let teacher2UserId: string

  if (teacher2UserQuery.empty) {
    const userRef = await db.collection('users').add({
      username: 'teacher2',
      password: 'teacher123',
      role: 'TEACHER',
      name: 'Anita Verma',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
    teacher2UserId = userRef.id
  } else {
    teacher2UserId = teacher2UserQuery.docs[0].id
  }

  const teacher2Query = await db.collection('teachers').where('userId', '==', teacher2UserId).get()

  if (teacher2Query.empty) {
    const physicsSubjectId = subjectIds['Class 9 CBSE_Physics']
    const physicsSubject = physicsSubjectId ? {
      id: `${physicsSubjectId}_${classIds['Class 9 CBSE']}`,
      subjectId: physicsSubjectId,
      subjectName: 'Physics',
      classId: classIds['Class 9 CBSE'],
      className: 'Class 9 CBSE'
    } : null

    await db.collection('teachers').add({
      userId: teacher2UserId,
      username: 'teacher2',
      name: 'Anita Verma',
      subjects: physicsSubject ? [physicsSubject] : [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
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
    const studentUserQuery = await db.collection('users').where('username', '==', s.username).get()

    let studentUserId: string
    if (studentUserQuery.empty) {
      const userRef = await db.collection('users').add({
        username: s.username,
        password: 'student123',
        role: 'STUDENT',
        name: s.name,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      studentUserId = userRef.id
    } else {
      studentUserId = studentUserQuery.docs[0].id
    }

    const studentQuery = await db.collection('students').where('userId', '==', studentUserId).get()

    if (studentQuery.empty) {
      await db.collection('students').add({
        userId: studentUserId,
        username: s.username,
        name: s.name,
        classId: class9CBSEId,
        className: 'Class 9 CBSE',
        rollNo: s.rollNo,
        subjectIds: class9CBSESubjects,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      console.log(`✅ Student created: ${s.name} (${s.rollNo})`)
    } else {
      console.log(`⏭️  Student already exists: ${s.name}`)
    }
  }

  console.log('')
  console.log('🎉 Seeding complete!')
  console.log('')
  console.log('📋 Login Credentials:')
  console.log('   Admin:    shobhit / Shobhit@1502')
  console.log('   Teacher:  teacher1 / teacher123 (Mathematics)')
  console.log('   Teacher:  teacher2 / teacher123 (Physics)')
  console.log('   Student:  student1-5 / student123')
  console.log('')
  console.log('⚠️  IMPORTANT: Now deploy Phase 2 Firestore security rules!')
  console.log('   See: firestore.rules file')
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Seeding failed:', err)
    process.exit(1)
  })
