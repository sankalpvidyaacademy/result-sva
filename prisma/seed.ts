import { db } from '@/lib/db';

async function main() {
  console.log('🌱 Seeding database...');

  // Create Admin user
  const admin = await db.user.upsert({
    where: { username: 'shobhit' },
    update: {},
    create: {
      username: 'shobhit',
      password: 'Shobhit@1502',
      role: 'ADMIN',
      name: 'Shobhit (Admin)',
    },
  });
  console.log('✅ Admin created:', admin.username);

  // Create Classes
  const classNames = [
    'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8',
    'Class 9 CBSE', 'Class 10 CBSE',
    'Class 9 ICSE', 'Class 10 ICSE',
    'Class 11 Science', 'Class 12 Science',
    'Class 11 Commerce', 'Class 12 Commerce',
  ];

  const classes = [];
  for (const name of classNames) {
    const cls = await db.class.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    classes.push(cls);
  }
  console.log('✅ Classes created:', classes.length);

  // Create Subjects per class
  // Class 4-8: A, H, R, S
  const class48Subjects = ['A-4-8 Subject', 'H-4-8 Subject', 'R-4-8 Subject', 'S-4-8 Subject'];
  // Class 9-10 (CBSE & ICSE): Mathematics, Physics, Chemistry, Biology, English, SST
  const class910Subjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'SST'];
  // Class 11-12 Science: Mathematics, Physics, Chemistry, Biology
  const class1112ScienceSubjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology'];
  // Class 11-12 Commerce: Accounts, Business Studies, Economics, English, Applied Mathematics
  const class1112CommerceSubjects = ['Accounts', 'Business Studies', 'Economics', 'English', 'Applied Mathematics'];

  for (const cls of classes) {
    let subjects: string[] = [];
    if (cls.name.startsWith('Class 4') || cls.name.startsWith('Class 5') || 
        cls.name.startsWith('Class 6') || cls.name.startsWith('Class 7') || 
        cls.name.startsWith('Class 8')) {
      subjects = class48Subjects;
    } else if (cls.name.includes('CBSE') || cls.name.includes('ICSE')) {
      subjects = class910Subjects;
    } else if (cls.name.includes('Science')) {
      subjects = class1112ScienceSubjects;
    } else if (cls.name.includes('Commerce')) {
      subjects = class1112CommerceSubjects;
    }

    for (const subjectName of subjects) {
      await db.subject.upsert({
        where: {
          name_classId: {
            name: subjectName,
            classId: cls.id,
          },
        },
        update: {},
        create: {
          name: subjectName,
          classId: cls.id,
        },
      });
    }
  }
  console.log('✅ Subjects created for all classes');

  // Create sample teacher
  const teacher1User = await db.user.upsert({
    where: { username: 'teacher1' },
    update: {},
    create: {
      username: 'teacher1',
      password: 'teacher123',
      role: 'TEACHER',
      name: 'Rajesh Kumar',
    },
  });

  const teacher1 = await db.teacher.upsert({
    where: { userId: teacher1User.id },
    update: {},
    create: {
      userId: teacher1User.id,
    },
  });

  // Assign teacher1 to Class 9 CBSE Mathematics
  const class9CBSE = classes.find(c => c.name === 'Class 9 CBSE')!;
  const mathSubject = await db.subject.findFirst({
    where: { name: 'Mathematics', classId: class9CBSE.id },
  });
  if (mathSubject) {
    await db.teacherSubject.upsert({
      where: {
        teacherId_subjectId: {
          teacherId: teacher1.id,
          subjectId: mathSubject.id,
        },
      },
      update: {},
      create: {
        teacherId: teacher1.id,
        subjectId: mathSubject.id,
      },
    });
  }

  // Create sample student
  const student1User = await db.user.upsert({
    where: { username: 'student1' },
    update: {},
    create: {
      username: 'student1',
      password: 'student123',
      role: 'STUDENT',
      name: 'Amit Sharma',
    },
  });

  await db.student.upsert({
    where: { userId: student1User.id },
    update: {},
    create: {
      userId: student1User.id,
      classId: class9CBSE.id,
      rollNo: '001',
    },
  });

  // Create more sample students
  const studentNames = [
    { username: 'student2', name: 'Priya Patel', rollNo: '002' },
    { username: 'student3', name: 'Rahul Singh', rollNo: '003' },
    { username: 'student4', name: 'Neha Gupta', rollNo: '004' },
    { username: 'student5', name: 'Vikram Joshi', rollNo: '005' },
  ];

  for (const s of studentNames) {
    const user = await db.user.upsert({
      where: { username: s.username },
      update: {},
      create: {
        username: s.username,
        password: 'student123',
        role: 'STUDENT',
        name: s.name,
      },
    });
    await db.student.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        classId: class9CBSE.id,
        rollNo: s.rollNo,
      },
    });
  }

  // Create sample teacher 2 for physics
  const teacher2User = await db.user.upsert({
    where: { username: 'teacher2' },
    update: {},
    create: {
      username: 'teacher2',
      password: 'teacher123',
      role: 'TEACHER',
      name: 'Anita Verma',
    },
  });

  const teacher2 = await db.teacher.upsert({
    where: { userId: teacher2User.id },
    update: {},
    create: {
      userId: teacher2User.id,
    },
  });

  const physicsSubject = await db.subject.findFirst({
    where: { name: 'Physics', classId: class9CBSE.id },
  });
  if (physicsSubject) {
    await db.teacherSubject.upsert({
      where: {
        teacherId_subjectId: {
          teacherId: teacher2.id,
          subjectId: physicsSubject.id,
        },
      },
      update: {},
      create: {
        teacherId: teacher2.id,
        subjectId: physicsSubject.id,
      },
    });
  }

  console.log('✅ Sample teachers and students created');
  console.log('🎉 Seeding complete!');
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
