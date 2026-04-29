import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const teachers = await db.teacher.findMany({
      orderBy: { user: { name: 'asc' } },
      include: {
        user: {
          select: { id: true, username: true, name: true },
        },
        teacherSubjects: {
          include: {
            subject: {
              include: {
                class: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
      },
    });

    // Transform the data to a cleaner format
    const formatted = teachers.map((teacher) => ({
      id: teacher.id,
      userId: teacher.userId,
      user: teacher.user,
      subjects: teacher.teacherSubjects.map((ts) => ({
        id: ts.id,
        subjectId: ts.subjectId,
        subjectName: ts.subject.name,
        classId: ts.subject.classId,
        className: ts.subject.class.name,
      })),
    }));

    return NextResponse.json({ success: true, teachers: formatted });
  } catch (error) {
    console.error('Get teachers error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, name, subjects } = body;

    if (!username || !password || !name) {
      return NextResponse.json(
        { success: false, message: 'Username, password, and name are required' },
        { status: 400 }
      );
    }

    if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
      return NextResponse.json(
        { success: false, message: 'At least one subject assignment is required' },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existingUser = await db.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Username already exists' },
        { status: 409 }
      );
    }

    // Validate all subject assignments
    for (const sub of subjects) {
      if (!sub.classId || !sub.subjectId) {
        return NextResponse.json(
          { success: false, message: 'Each subject assignment must have classId and subjectId' },
          { status: 400 }
        );
      }

      const subject = await db.subject.findUnique({
        where: { id: sub.subjectId },
      });

      if (!subject || subject.classId !== sub.classId) {
        return NextResponse.json(
          { success: false, message: `Subject ${sub.subjectId} does not belong to class ${sub.classId}` },
          { status: 400 }
        );
      }
    }

    // Create User + Teacher + TeacherSubjects in a transaction
    const result = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username,
          password,
          role: 'TEACHER',
          name,
        },
      });

      const teacher = await tx.teacher.create({
        data: {
          userId: user.id,
        },
      });

      // Create all teacher-subject assignments
      const teacherSubjects = await Promise.all(
        subjects.map((sub: { classId: string; subjectId: string }) =>
          tx.teacherSubject.create({
            data: {
              teacherId: teacher.id,
              subjectId: sub.subjectId,
            },
            include: {
              subject: {
                include: {
                  class: {
                    select: { id: true, name: true },
                  },
                },
              },
            },
          })
        )
      );

      return {
        id: teacher.id,
        userId: user.id,
        user: { id: user.id, username: user.username, name: user.name },
        subjects: teacherSubjects.map((ts) => ({
          id: ts.id,
          subjectId: ts.subjectId,
          subjectName: ts.subject.name,
          classId: ts.subject.classId,
          className: ts.subject.class.name,
        })),
      };
    });

    return NextResponse.json({ success: true, teacher: result }, { status: 201 });
  } catch (error) {
    console.error('Create teacher error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
