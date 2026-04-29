import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const test = await db.test.findUnique({
      where: { id },
      include: {
        subject: {
          select: { id: true, name: true },
        },
        class: {
          select: { id: true, name: true },
        },
        teacher: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
        marks: {
          include: {
            student: {
              include: {
                user: {
                  select: { id: true, name: true },
                },
              },
            },
          },
          orderBy: {
            student: { rollNo: 'asc' },
          },
        },
      },
    });

    if (!test) {
      return NextResponse.json(
        { success: false, message: 'Test not found' },
        { status: 404 }
      );
    }

    const today = new Date().toISOString().split('T')[0];
    let status: string;
    if (test.date === today) {
      status = 'Today';
    } else if (test.date > today) {
      status = 'Upcoming';
    } else {
      status = 'Completed';
    }

    const formatted = {
      id: test.id,
      name: test.name,
      date: test.date,
      maxMarks: test.maxMarks,
      status,
      subject: test.subject,
      class: test.class,
      teacher: {
        id: test.teacher.id,
        name: test.teacher.user.name,
      },
      marks: test.marks.map((m) => ({
        id: m.id,
        marks: m.marks,
        student: {
          id: m.student.id,
          rollNo: m.student.rollNo,
          name: m.student.user.name,
        },
      })),
      createdAt: test.createdAt,
    };

    return NextResponse.json({ success: true, test: formatted });
  } catch (error) {
    console.error('Get test error:', error);
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
    const { name, classId, subjectId, teacherId, date, maxMarks } = body;

    const existingTest = await db.test.findUnique({
      where: { id },
    });

    if (!existingTest) {
      return NextResponse.json(
        { success: false, message: 'Test not found' },
        { status: 404 }
      );
    }

    // If date or classId is changing, re-validate the gap constraint
    const newDate = date || existingTest.date;
    const newClassId = classId || existingTest.classId;

    if (date || classId) {
      // Check only 1 test per day per class (excluding current test)
      const conflictTest = await db.test.findFirst({
        where: {
          classId: newClassId,
          date: newDate,
          id: { not: id },
        },
      });

      if (conflictTest) {
        return NextResponse.json(
          { success: false, message: `A test is already scheduled for this class on ${newDate}.` },
          { status: 409 }
        );
      }

      // Check 2-day gap (excluding current test)
      const otherTests = await db.test.findMany({
        where: {
          classId: newClassId,
          id: { not: id },
        },
        select: { date: true, name: true },
      });

      const newDateObj = new Date(newDate);
      for (const other of otherTests) {
        const otherDateObj = new Date(other.date);
        const diffDays = Math.abs(
          (newDateObj.getTime() - otherDateObj.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diffDays <= 2) {
          return NextResponse.json(
            {
              success: false,
              message: `Minimum 2 days gap required. Test "${other.name}" on ${other.date} is too close.`,
            },
            { status: 409 }
          );
        }
      }
    }

    // If teacher or subject is changing, validate teacher-subject assignment
    const newTeacherId = teacherId || existingTest.teacherId;
    const newSubjectId = subjectId || existingTest.subjectId;

    if (teacherId || subjectId) {
      const teacherSubject = await db.teacherSubject.findUnique({
        where: {
          teacherId_subjectId: {
            teacherId: newTeacherId,
            subjectId: newSubjectId,
          },
        },
      });

      if (!teacherSubject) {
        return NextResponse.json(
          { success: false, message: 'Teacher is not assigned to this subject' },
          { status: 400 }
        );
      }
    }

    const updateData: {
      name?: string;
      classId?: string;
      subjectId?: string;
      teacherId?: string;
      date?: string;
      maxMarks?: number;
    } = {};
    if (name) updateData.name = name;
    if (classId) updateData.classId = classId;
    if (subjectId) updateData.subjectId = subjectId;
    if (teacherId) updateData.teacherId = teacherId;
    if (date) updateData.date = date;
    if (maxMarks) updateData.maxMarks = parseInt(String(maxMarks));

    const test = await db.test.update({
      where: { id },
      data: updateData,
      include: {
        subject: {
          select: { id: true, name: true },
        },
        class: {
          select: { id: true, name: true },
        },
        teacher: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    const today = new Date().toISOString().split('T')[0];
    let status: string;
    if (test.date === today) {
      status = 'Today';
    } else if (test.date > today) {
      status = 'Upcoming';
    } else {
      status = 'Completed';
    }

    return NextResponse.json({
      success: true,
      test: {
        id: test.id,
        name: test.name,
        date: test.date,
        maxMarks: test.maxMarks,
        status,
        subject: test.subject,
        class: test.class,
        teacher: {
          id: test.teacher.id,
          name: test.teacher.user.name,
        },
      },
    });
  } catch (error) {
    console.error('Update test error:', error);
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

    const test = await db.test.findUnique({
      where: { id },
    });

    if (!test) {
      return NextResponse.json(
        { success: false, message: 'Test not found' },
        { status: 404 }
      );
    }

    // Cascade will handle marks deletion
    await db.test.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete test error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
