import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const teacher = await db.teacher.findUnique({
      where: { id },
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

    if (!teacher) {
      return NextResponse.json(
        { success: false, message: 'Teacher not found' },
        { status: 404 }
      );
    }

    const formatted = {
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
    };

    return NextResponse.json({ success: true, teacher: formatted });
  } catch (error) {
    console.error('Get teacher error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, subjects } = body;

    const teacher = await db.teacher.findUnique({
      where: { id },
    });

    if (!teacher) {
      return NextResponse.json(
        { success: false, message: 'Teacher not found' },
        { status: 404 }
      );
    }

    // Update name if provided
    if (name) {
      await db.user.update({
        where: { id: teacher.userId },
        data: { name },
      });
    }

    // Update subjects if provided
    if (subjects && Array.isArray(subjects)) {
      // Validate all subject assignments
      for (const sub of subjects) {
        if (!sub.classId || !sub.subjectId) {
          return NextResponse.json(
            { success: false, message: 'Each subject assignment must have classId and subjectId' },
            { status: 400 }
          );
        }
      }

      await db.$transaction(async (tx) => {
        // Delete existing teacher subjects
        await tx.teacherSubject.deleteMany({
          where: { teacherId: id },
        });

        // Create new teacher subjects
        await Promise.all(
          subjects.map((sub: { classId: string; subjectId: string }) =>
            tx.teacherSubject.create({
              data: {
                teacherId: id,
                subjectId: sub.subjectId,
              },
            })
          )
        );
      });
    }

    // Fetch updated teacher
    const updatedTeacher = await db.teacher.findUnique({
      where: { id },
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

    const formatted = {
      id: updatedTeacher!.id,
      userId: updatedTeacher!.userId,
      user: updatedTeacher!.user,
      subjects: updatedTeacher!.teacherSubjects.map((ts) => ({
        id: ts.id,
        subjectId: ts.subjectId,
        subjectName: ts.subject.name,
        classId: ts.subject.classId,
        className: ts.subject.class.name,
      })),
    };

    return NextResponse.json({ success: true, teacher: formatted });
  } catch (error) {
    console.error('Update teacher error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const teacher = await db.teacher.findUnique({
      where: { id },
    });

    if (!teacher) {
      return NextResponse.json(
        { success: false, message: 'Teacher not found' },
        { status: 404 }
      );
    }

    // Delete teacher and associated user (cascade handles teacherSubjects and tests)
    await db.$transaction(async (tx) => {
      await tx.teacher.delete({ where: { id } });
      await tx.user.delete({ where: { id: teacher.userId } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete teacher error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
