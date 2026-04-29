import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const teacherId = searchParams.get('teacherId');

    const where: { classId?: string; teacherId?: string } = {};
    if (classId) where.classId = classId;
    if (teacherId) where.teacherId = teacherId;

    const today = new Date().toISOString().split('T')[0];

    const tests = await db.test.findMany({
      where,
      orderBy: { date: 'desc' },
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
        _count: {
          select: { marks: true },
        },
      },
    });

    const formatted = tests.map((test) => {
      let status: string;
      if (test.date === today) {
        status = 'Today';
      } else if (test.date > today) {
        status = 'Upcoming';
      } else {
        status = 'Completed';
      }

      return {
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
        marksCount: test._count.marks,
        createdAt: test.createdAt,
      };
    });

    return NextResponse.json({ success: true, tests: formatted });
  } catch (error) {
    console.error('Get tests error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, classId, subjectId, teacherId, date, maxMarks } = body;

    if (!name || !classId || !subjectId || !teacherId || !date || !maxMarks) {
      return NextResponse.json(
        { success: false, message: 'All fields are required: name, classId, subjectId, teacherId, date, maxMarks' },
        { status: 400 }
      );
    }

    if (maxMarks <= 0) {
      return NextResponse.json(
        { success: false, message: 'maxMarks must be a positive number' },
        { status: 400 }
      );
    }

    // Check teacher is assigned to this subject
    const teacherSubject = await db.teacherSubject.findUnique({
      where: {
        teacherId_subjectId: {
          teacherId,
          subjectId,
        },
      },
    });

    if (!teacherSubject) {
      return NextResponse.json(
        { success: false, message: 'Teacher is not assigned to this subject' },
        { status: 400 }
      );
    }

    // Check subject belongs to the class
    const subject = await db.subject.findUnique({
      where: { id: subjectId },
    });

    if (!subject || subject.classId !== classId) {
      return NextResponse.json(
        { success: false, message: 'Subject does not belong to this class' },
        { status: 400 }
      );
    }

    // Validate: Only 1 test per day per class (same class + same date)
    const existingTestSameDay = await db.test.findFirst({
      where: {
        classId,
        date,
      },
    });

    if (existingTestSameDay) {
      return NextResponse.json(
        { success: false, message: `A test is already scheduled for this class on ${date}. Only 1 test per day per class is allowed.` },
        { status: 409 }
      );
    }

    // Validate: Minimum 2 days gap between tests (same class)
    const existingTests = await db.test.findMany({
      where: { classId },
      select: { date: true, name: true },
    });

    const newDate = new Date(date);
    for (const existing of existingTests) {
      const existingDate = new Date(existing.date);
      const diffDays = Math.abs(
        (newDate.getTime() - existingDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays <= 2) {
        return NextResponse.json(
          {
            success: false,
            message: `Minimum 2 days gap required between tests. Existing test "${existing.name}" on ${existing.date} is too close to ${date}.`,
          },
          { status: 409 }
        );
      }
    }

    const test = await db.test.create({
      data: {
        name,
        classId,
        subjectId,
        teacherId,
        date,
        maxMarks: parseInt(String(maxMarks)),
      },
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

    return NextResponse.json(
      {
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
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create test error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
