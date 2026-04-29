import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params;
    const { searchParams } = new URL(request.url);
    const testIdsParam = searchParams.get('testIds');

    // Verify class exists
    const classData = await db.class.findUnique({
      where: { id: classId },
      include: {
        subjects: { orderBy: { name: 'asc' } },
      },
    });

    if (!classData) {
      return NextResponse.json(
        { success: false, message: 'Class not found' },
        { status: 404 }
      );
    }

    // Get completed tests for this class
    const today = new Date().toISOString().split('T')[0];
    const testWhere: { classId: string; id?: { in: string[] }; date: { lte: string } } = {
      classId,
      date: { lte: today },
    };

    if (testIdsParam) {
      const testIds = testIdsParam.split(',');
      testWhere.id = { in: testIds };
    }

    const tests = await db.test.findMany({
      where: testWhere,
      orderBy: { date: 'asc' },
      include: {
        subject: { select: { id: true, name: true } },
        marks: true,
      },
    });

    if (tests.length === 0) {
      return NextResponse.json({
        success: true,
        class: { id: classData.id, name: classData.name },
        tests: [],
        students: [],
      });
    }

    // Get all students in the class with their marks
    const students = await db.student.findMany({
      where: { classId },
      orderBy: { rollNo: 'asc' },
      include: {
        user: { select: { id: true, name: true } },
        marks: {
          where: {
            testId: { in: tests.map((t) => t.id) },
          },
        },
      },
    });

    // Build result data
    const totalMaxMarks = tests.reduce((sum, t) => sum + t.maxMarks, 0);

    const studentResults = students.map((student) => {
      const subjectMarks: Record<string, { marks: number; maxMarks: number; testName: string }> = {};
      let totalMarks = 0;

      for (const test of tests) {
        const markEntry = student.marks.find((m) => m.testId === test.id);
        const obtainedMarks = markEntry ? markEntry.marks : 0;
        totalMarks += obtainedMarks;

        subjectMarks[test.subjectId] = {
          marks: obtainedMarks,
          maxMarks: test.maxMarks,
          testName: test.name,
        };
      }

      const percentage = totalMaxMarks > 0 ? Math.round((totalMarks / totalMaxMarks) * 100 * 100) / 100 : 0;

      // Find weak subject (lowest scoring by percentage)
      let weakSubject: { subjectId: string; subjectName: string; marks: number; maxMarks: number; percentage: number } | null = null;
      let lowestPercentage = Infinity;

      for (const test of tests) {
        const sm = subjectMarks[test.subjectId];
        if (sm) {
          const pct = sm.maxMarks > 0 ? (sm.marks / sm.maxMarks) * 100 : 0;
          if (pct < lowestPercentage) {
            lowestPercentage = pct;
            weakSubject = {
              subjectId: test.subjectId,
              subjectName: test.subject.name,
              marks: sm.marks,
              maxMarks: sm.maxMarks,
              percentage: Math.round(pct * 100) / 100,
            };
          }
        }
      }

      return {
        studentId: student.id,
        rollNo: student.rollNo,
        name: student.user.name,
        subjectMarks,
        totalMarks,
        totalMaxMarks,
        percentage,
        weakSubject,
        testsTaken: student.marks.length,
      };
    });

    // Sort by total marks descending for ranking
    studentResults.sort((a, b) => b.totalMarks - a.totalMarks);

    // Assign ranks (handle ties)
    let currentRank = 1;
    for (let i = 0; i < studentResults.length; i++) {
      if (i > 0 && studentResults[i].totalMarks < studentResults[i - 1].totalMarks) {
        currentRank = i + 1;
      }
      studentResults[i].rank = currentRank;
    }

    return NextResponse.json({
      success: true,
      class: { id: classData.id, name: classData.name },
      subjects: classData.subjects,
      tests: tests.map((t) => ({
        id: t.id,
        name: t.name,
        date: t.date,
        maxMarks: t.maxMarks,
        subject: t.subject,
      })),
      totalMaxMarks,
      students: studentResults,
    });
  } catch (error) {
    console.error('Get class results error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
