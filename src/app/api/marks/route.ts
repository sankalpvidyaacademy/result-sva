import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const testId = searchParams.get('testId');
    const studentId = searchParams.get('studentId');

    if (!testId && !studentId) {
      return NextResponse.json(
        { success: false, message: 'Either testId or studentId query parameter is required' },
        { status: 400 }
      );
    }

    const where: { testId?: string; studentId?: string } = {};
    if (testId) where.testId = testId;
    if (studentId) where.studentId = studentId;

    const marks = await db.marks.findMany({
      where,
      include: {
        test: {
          include: {
            subject: { select: { id: true, name: true } },
            class: { select: { id: true, name: true } },
          },
        },
        student: {
          include: {
            user: { select: { id: true, name: true } },
            class: { select: { id: true, name: true } },
          },
        },
      },
    });

    const formatted = marks.map((m) => ({
      id: m.id,
      marks: m.marks,
      test: {
        id: m.test.id,
        name: m.test.name,
        date: m.test.date,
        maxMarks: m.test.maxMarks,
        subject: m.test.subject,
        class: m.test.class,
      },
      student: {
        id: m.student.id,
        rollNo: m.student.rollNo,
        name: m.student.user.name,
        class: m.student.class,
      },
    }));

    return NextResponse.json({ success: true, marks: formatted });
  } catch (error) {
    console.error('Get marks error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { testId, entries } = body;

    if (!testId || !entries || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        { success: false, message: 'testId and entries array are required' },
        { status: 400 }
      );
    }

    // Get the test to validate maxMarks
    const test = await db.test.findUnique({
      where: { id: testId },
    });

    if (!test) {
      return NextResponse.json(
        { success: false, message: 'Test not found' },
        { status: 404 }
      );
    }

    // Validate all entries
    for (const entry of entries) {
      if (!entry.studentId || entry.marks === undefined || entry.marks === null) {
        return NextResponse.json(
          { success: false, message: 'Each entry must have studentId and marks' },
          { status: 400 }
        );
      }

      if (entry.marks > test.maxMarks) {
        return NextResponse.json(
          { success: false, message: `Marks ${entry.marks} exceed max marks ${test.maxMarks} for this test` },
          { status: 400 }
        );
      }

      if (entry.marks < 0) {
        return NextResponse.json(
          { success: false, message: 'Marks cannot be negative' },
          { status: 400 }
        );
      }
    }

    // Bulk upsert marks
    const results = await db.$transaction(
      entries.map((entry: { studentId: string; marks: number }) =>
        db.marks.upsert({
          where: {
            testId_studentId: {
              testId,
              studentId: entry.studentId,
            },
          },
          update: {
            marks: entry.marks,
          },
          create: {
            testId,
            studentId: entry.studentId,
            marks: entry.marks,
          },
        })
      )
    );

    return NextResponse.json(
      { success: true, marks: results, count: results.length },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create marks error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
