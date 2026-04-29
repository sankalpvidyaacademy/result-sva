import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const { subjectId } = await params;
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');

    const subject = await db.subject.findUnique({
      where: { id: subjectId },
      include: {
        class: {
          select: { id: true, name: true },
        },
      },
    });

    if (!subject) {
      return NextResponse.json(
        { success: false, message: 'Subject not found' },
        { status: 404 }
      );
    }

    // Get all tests for this subject, filtered by date range
    const today = new Date().toISOString().split('T')[0];
    const dateFilter: { lte: string; gte?: string } = { lte: today };
    if (fromDate && toDate) {
      dateFilter.gte = fromDate;
      dateFilter.lte = toDate;
    } else if (fromDate) {
      dateFilter.gte = fromDate;
    } else if (toDate) {
      dateFilter.lte = toDate;
    }

    const tests = await db.test.findMany({
      where: {
        subjectId,
        date: dateFilter,
      },
      orderBy: { date: 'asc' },
      include: {
        marks: {
          include: {
            student: {
              include: {
                user: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    const totalMaxMarks = tests.reduce((sum, t) => sum + t.maxMarks, 0);

    // Get all students in the class
    const students = await db.student.findMany({
      where: { classId: subject.classId },
      orderBy: { rollNo: 'asc' },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    // Build per-student results for this subject
    const studentResults = students.map((student) => {
      let totalMarks = 0;
      const testMarks: { testId: string; testName: string; date: string; marks: number; maxMarks: number }[] = [];

      for (const test of tests) {
        const markEntry = test.marks.find((m) => m.studentId === student.id);
        const obtainedMarks = markEntry ? markEntry.marks : 0;
        totalMarks += obtainedMarks;

        testMarks.push({
          testId: test.id,
          testName: test.name,
          date: test.date,
          marks: obtainedMarks,
          maxMarks: test.maxMarks,
        });
      }

      const percentage = totalMaxMarks > 0 ? Math.round((totalMarks / totalMaxMarks) * 100 * 100) / 100 : 0;

      return {
        studentId: student.id,
        rollNo: student.rollNo,
        name: student.user.name,
        totalMarks,
        totalMaxMarks,
        percentage,
        testMarks,
        rank: 0,
      };
    });

    // Sort by total marks for ranking
    studentResults.sort((a, b) => b.totalMarks - a.totalMarks);
    let currentRank = 1;
    for (let i = 0; i < studentResults.length; i++) {
      if (i > 0 && studentResults[i].totalMarks < studentResults[i - 1].totalMarks) {
        currentRank = i + 1;
      }
      studentResults[i].rank = currentRank;
    }

    // Subject statistics
    const totalStudents = studentResults.length;
    const avgMarks = totalStudents > 0
      ? Math.round(studentResults.reduce((sum, s) => sum + s.totalMarks, 0) / totalStudents * 100) / 100
      : 0;
    const avgPercentage = totalMaxMarks > 0 && totalStudents > 0
      ? Math.round((avgMarks / totalMaxMarks) * 100 * 100) / 100
      : 0;
    const highestMarks = studentResults.length > 0 ? studentResults[0].totalMarks : 0;
    const lowestMarks = studentResults.length > 0 ? studentResults[studentResults.length - 1].totalMarks : 0;

    // Per-test statistics
    const testStatistics = tests.map((test) => {
      const marksList = test.marks.map((m) => m.marks);
      const avg = marksList.length > 0
        ? Math.round(marksList.reduce((sum, m) => sum + m, 0) / marksList.length * 100) / 100
        : 0;
      const highest = marksList.length > 0 ? Math.max(...marksList) : 0;
      const lowest = marksList.length > 0 ? Math.min(...marksList) : 0;
      const passCount = marksList.filter((m) => m >= test.maxMarks * 0.4).length;
      const passPercentage = marksList.length > 0
        ? Math.round((passCount / marksList.length) * 100 * 100) / 100
        : 0;

      return {
        testId: test.id,
        testName: test.name,
        date: test.date,
        maxMarks: test.maxMarks,
        averageMarks: avg,
        highestMarks: highest,
        lowestMarks: lowest,
        studentsAttempted: marksList.length,
        passCount,
        passPercentage,
      };
    });

    // Grade distribution
    const getGrade = (pct: number): string => {
      if (pct >= 90) return 'A+';
      if (pct >= 80) return 'A';
      if (pct >= 70) return 'B+';
      if (pct >= 60) return 'B';
      if (pct >= 50) return 'C';
      if (pct >= 40) return 'D';
      return 'F';
    };

    const gradeDistribution: Record<string, number> = {};
    for (const sr of studentResults) {
      const grade = getGrade(sr.percentage);
      gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1;
    }

    return NextResponse.json({
      success: true,
      report: {
        subject: {
          id: subject.id,
          name: subject.name,
          class: subject.class,
        },
        totalTests: tests.length,
        totalMaxMarks,
        statistics: {
          totalStudents,
          averageMarks: avgMarks,
          averagePercentage: avgPercentage,
          highestMarks,
          lowestMarks,
          gradeDistribution,
        },
        testStatistics,
        students: studentResults,
        dateRange: fromDate || toDate ? { from: fromDate || null, to: toDate || null } : null,
      },
    });
  } catch (error) {
    console.error('Get subject report error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
