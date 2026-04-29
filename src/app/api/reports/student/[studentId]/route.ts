import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await params;

    const student = await db.student.findUnique({
      where: { id: studentId },
      include: {
        user: { select: { id: true, name: true, username: true } },
        class: {
          include: {
            subjects: { orderBy: { name: 'asc' } },
          },
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
      },
    });

    if (!student) {
      return NextResponse.json(
        { success: false, message: 'Student not found' },
        { status: 404 }
      );
    }

    // Get all completed tests for the class
    const today = new Date().toISOString().split('T')[0];
    const tests = await db.test.findMany({
      where: {
        classId: student.classId,
        date: { lte: today },
      },
      orderBy: { date: 'asc' },
      include: {
        subject: { select: { id: true, name: true } },
        marks: true,
      },
    });

    // Build subject-wise summary
    const subjectSummary: Record<string, {
      subjectId: string;
      subjectName: string;
      testsTaken: number;
      totalMarks: number;
      totalMaxMarks: number;
      percentage: number;
      grade: string;
    }> = {};

    for (const subject of student.class.subjects) {
      subjectSummary[subject.id] = {
        subjectId: subject.id,
        subjectName: subject.name,
        testsTaken: 0,
        totalMarks: 0,
        totalMaxMarks: 0,
        percentage: 0,
        grade: '',
      };
    }

    let grandTotal = 0;
    let grandTotalMax = 0;

    for (const test of tests) {
      const markEntry = student.marks.find((m) => m.testId === test.id);
      const obtainedMarks = markEntry ? markEntry.marks : 0;

      if (subjectSummary[test.subjectId]) {
        subjectSummary[test.subjectId].testsTaken += 1;
        subjectSummary[test.subjectId].totalMarks += obtainedMarks;
        subjectSummary[test.subjectId].totalMaxMarks += test.maxMarks;
      }

      grandTotal += obtainedMarks;
      grandTotalMax += test.maxMarks;
    }

    // Calculate grades
    const getGrade = (pct: number): string => {
      if (pct >= 90) return 'A+';
      if (pct >= 80) return 'A';
      if (pct >= 70) return 'B+';
      if (pct >= 60) return 'B';
      if (pct >= 50) return 'C';
      if (pct >= 40) return 'D';
      return 'F';
    };

    let weakSubject: { subjectId: string; subjectName: string; percentage: number } | null = null;
    let lowestPercentage = Infinity;

    for (const key of Object.keys(subjectSummary)) {
      const ss = subjectSummary[key];
      ss.percentage = ss.totalMaxMarks > 0 ? Math.round((ss.totalMarks / ss.totalMaxMarks) * 100 * 100) / 100 : 0;
      ss.grade = getGrade(ss.percentage);
      if (ss.totalMaxMarks > 0 && ss.percentage < lowestPercentage) {
        lowestPercentage = ss.percentage;
        weakSubject = {
          subjectId: ss.subjectId,
          subjectName: ss.subjectName,
          percentage: ss.percentage,
        };
      }
    }

    const overallPercentage = grandTotalMax > 0 ? Math.round((grandTotal / grandTotalMax) * 100 * 100) / 100 : 0;
    const overallGrade = getGrade(overallPercentage);

    // Calculate rank in class
    const classStudents = await db.student.findMany({
      where: { classId: student.classId },
      include: {
        user: { select: { id: true, name: true } },
        marks: {
          where: {
            testId: { in: tests.map((t) => t.id) },
          },
        },
      },
    });

    const studentTotals = classStudents.map((s) => ({
      studentId: s.id,
      name: s.user.name,
      totalMarks: s.marks.reduce((sum, m) => sum + m.marks, 0),
    }));

    studentTotals.sort((a, b) => b.totalMarks - a.totalMarks);

    let rank = 1;
    for (let i = 0; i < studentTotals.length; i++) {
      if (i > 0 && studentTotals[i].totalMarks < studentTotals[i - 1].totalMarks) {
        rank = i + 1;
      }
      if (studentTotals[i].studentId === studentId) {
        break;
      }
    }

    // Test details with marks
    const testDetails = tests.map((test) => {
      const markEntry = student.marks.find((m) => m.testId === test.id);
      const obtainedMarks = markEntry ? markEntry.marks : 0;
      const pct = test.maxMarks > 0 ? Math.round((obtainedMarks / test.maxMarks) * 100 * 100) / 100 : 0;

      return {
        testId: test.id,
        testName: test.name,
        date: test.date,
        subject: test.subject,
        maxMarks: test.maxMarks,
        marksObtained: obtainedMarks,
        percentage: pct,
        grade: getGrade(pct),
      };
    });

    return NextResponse.json({
      success: true,
      report: {
        student: {
          id: student.id,
          name: student.user.name,
          username: student.user.username,
          rollNo: student.rollNo,
          class: { id: student.class.id, name: student.class.name },
        },
        academicSummary: {
          totalMarks: grandTotal,
          totalMaxMarks: grandTotalMax,
          percentage: overallPercentage,
          grade: overallGrade,
          rank,
          totalStudents: classStudents.length,
          testsCompleted: tests.length,
          weakSubject,
        },
        subjectSummary: Object.values(subjectSummary),
        testDetails,
      },
    });
  } catch (error) {
    console.error('Get student report error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
