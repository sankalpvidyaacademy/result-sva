import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const student = await db.student.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, username: true, name: true },
        },
        class: {
          select: { id: true, name: true },
        },
        marks: {
          include: {
            test: {
              include: {
                subject: { select: { id: true, name: true } },
              },
            },
          },
        },
        studentSubjects: {
          include: {
            subject: {
              select: { id: true, name: true, classId: true },
            },
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json(
        { success: false, message: 'Student not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, student });
  } catch (error) {
    console.error('Get student error:', error);
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
    const { name, classId, rollNo, subjectIds } = body;

    const student = await db.student.findUnique({
      where: { id },
    });

    if (!student) {
      return NextResponse.json(
        { success: false, message: 'Student not found' },
        { status: 404 }
      );
    }

    // Update user name if provided
    if (name) {
      await db.user.update({
        where: { id: student.userId },
        data: { name },
      });
    }

    // Update student fields
    const updateData: { classId?: string; rollNo?: string } = {};
    if (classId) updateData.classId = classId;
    if (rollNo) updateData.rollNo = rollNo;

    const updatedStudent = await db.student.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { id: true, username: true, name: true },
        },
        class: {
          select: { id: true, name: true },
        },
        studentSubjects: {
          include: {
            subject: {
              select: { id: true, name: true, classId: true },
            },
          },
        },
      },
    });

    // Update subject selections if subjectIds is provided
    if (subjectIds !== undefined) {
      // Delete existing student subjects
      await db.studentSubject.deleteMany({
        where: { studentId: id },
      });

      // Create new student subjects if any
      if (Array.isArray(subjectIds) && subjectIds.length > 0) {
        await db.studentSubject.createMany({
          data: subjectIds.map((subjectId: string) => ({
            studentId: id,
            subjectId,
          })),
        });
      }

      // Re-fetch to include updated studentSubjects
      const refreshedStudent = await db.student.findUnique({
        where: { id },
        include: {
          user: {
            select: { id: true, username: true, name: true },
          },
          class: {
            select: { id: true, name: true },
          },
          studentSubjects: {
            include: {
              subject: {
                select: { id: true, name: true, classId: true },
              },
            },
          },
        },
      });

      return NextResponse.json({ success: true, student: refreshedStudent });
    }

    return NextResponse.json({ success: true, student: updatedStudent });
  } catch (error) {
    console.error('Update student error:', error);
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

    const student = await db.student.findUnique({
      where: { id },
    });

    if (!student) {
      return NextResponse.json(
        { success: false, message: 'Student not found' },
        { status: 404 }
      );
    }

    // Delete student and associated user (cascade will handle marks)
    await db.$transaction(async (tx) => {
      await tx.student.delete({ where: { id } });
      await tx.user.delete({ where: { id: student.userId } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete student error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
