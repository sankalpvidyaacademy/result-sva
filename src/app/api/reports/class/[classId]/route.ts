import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params;
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');

    const classData = await db.class.findUnique({
      where: { id: classId },
      include: {
        subjects: { orderBy: { name: 'asc' } },
        students: {
          orderBy: { rollNo: 'asc' },
          include: {
            user: { select: { id: true, name: true } },
            marks: {
              include: {
                test: {
                  include: {
                    subject: { select: { id: true, name: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!classData) {
      return NextResponse.json(
        { success: false, message: 'Class not found' },
        { status: 404 }
      );
    }

    // Get all completed tests, filtered by date range
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
        classId,
        date: dateFilter,
      },
      orderBy: { date: 'asc' },
      include: {
        subject: { select: { id: true, name: true } },
        marks: true,
      },
    });

    const totalMaxMarks = tests.reduce((sum, t) => sum + t.maxMarks, 0);

    // Build student results
    const studentResults = classData.students.map((student) => {
      let totalMarks = 0;
      const subjectMarks: Record<string, number> = {};
      const testMarks: Record<string, number> = {};

      for (const test of tests) {
        const markEntry = student.marks.find((m) => m.testId === test.id);
        const obtainedMarks = markEntry ? markEntry.marks : 0;
        totalMarks += obtainedMarks;
        subjectMarks[test.subjectId] = (subjectMarks[test.subjectId] || 0) + obtainedMarks;
        testMarks[test.id] = obtainedMarks;
      }

      const percentage = totalMaxMarks > 0 ? Math.round((totalMarks / totalMaxMarks) * 100 * 100) / 100 : 0;

      return {
        studentId: student.id,
        rollNo: student.rollNo,
        name: student.user.name,
        subjectMarks,
        testMarks,
        totalMarks,
        percentage,
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

    // Class statistics
    const totalStudents = studentResults.length;
    const avgPercentage = totalStudents > 0
      ? Math.round(studentResults.reduce((sum, s) => sum + s.percentage, 0) / totalStudents * 100) / 100
      : 0;
    const highestMarks = studentResults.length > 0 ? studentResults[0].totalMarks : 0;
    const lowestMarks = studentResults.length > 0 ? studentResults[studentResults.length - 1].totalMarks : 0;

    // Subject-wise class averages
    const subjectAverages = classData.subjects.map((subject) => {
      const subjectTestIds = tests.filter((t) => t.subjectId === subject.id);
      const subjectMax = subjectTestIds.reduce((sum, t) => sum + t.maxMarks, 0);

      let totalSubjectMarks = 0;
      let studentsWithMarks = 0;

      for (const sr of studentResults) {
        if (sr.subjectMarks[subject.id] !== undefined) {
          totalSubjectMarks += sr.subjectMarks[subject.id];
          studentsWithMarks++;
        }
      }

      const avgMarks = studentsWithMarks > 0 ? Math.round((totalSubjectMarks / studentsWithMarks) * 100) / 100 : 0;
      const avgPct = subjectMax > 0 ? Math.round((totalSubjectMarks / (studentsWithMarks * subjectMax)) * 100 * 100) / 100 : 0;

      return {
        subjectId: subject.id,
        subjectName: subject.name,
        totalTests: subjectTestIds.length,
        maxMarks: subjectMax,
        averageMarks: avgMarks,
        averagePercentage: avgPct,
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
        statistics: {
          totalStudents,
          totalTests: tests.length,
          averagePercentage: avgPercentage,
          highestMarks,
          lowestMarks,
          gradeDistribution,
        },
        subjectAverages,
        students: studentResults,
        dateRange: fromDate || toDate ? { from: fromDate || null, to: toDate || null } : null,
      },
    });
  } catch (error) {
    console.error('Get class report error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
