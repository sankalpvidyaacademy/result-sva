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

    // Build subject-wise marks
    const subjectWise: Record<string, {
      subjectId: string;
      subjectName: string;
      tests: { testId: string; testName: string; date: string; marks: number; maxMarks: number }[];
      totalMarks: number;
      totalMaxMarks: number;
      percentage: number;
    }> = {};

    for (const subject of student.class.subjects) {
      subjectWise[subject.id] = {
        subjectId: subject.id,
        subjectName: subject.name,
        tests: [],
        totalMarks: 0,
        totalMaxMarks: 0,
        percentage: 0,
      };
    }

    let grandTotal = 0;
    let grandTotalMax = 0;

    // Test-wise marks
    const testWise: {
      testId: string;
      testName: string;
      date: string;
      subjectId: string;
      subjectName: string;
      marks: number;
      maxMarks: number;
    }[] = [];

    for (const test of tests) {
      const markEntry = student.marks.find((m) => m.testId === test.id);
      const obtainedMarks = markEntry ? markEntry.marks : 0;

      testWise.push({
        testId: test.id,
        testName: test.name,
        date: test.date,
        subjectId: test.subjectId,
        subjectName: test.subject.name,
        marks: obtainedMarks,
        maxMarks: test.maxMarks,
      });

      // Add to subject-wise
      if (subjectWise[test.subjectId]) {
        subjectWise[test.subjectId].tests.push({
          testId: test.id,
          testName: test.name,
          date: test.date,
          marks: obtainedMarks,
          maxMarks: test.maxMarks,
        });
        subjectWise[test.subjectId].totalMarks += obtainedMarks;
        subjectWise[test.subjectId].totalMaxMarks += test.maxMarks;
      }

      grandTotal += obtainedMarks;
      grandTotalMax += test.maxMarks;
    }

    // Calculate subject percentages
    let weakSubject: { subjectId: string; subjectName: string; percentage: number } | null = null;
    let lowestPercentage = Infinity;

    for (const key of Object.keys(subjectWise)) {
      const sw = subjectWise[key];
      sw.percentage = sw.totalMaxMarks > 0 ? Math.round((sw.totalMarks / sw.totalMaxMarks) * 100 * 100) / 100 : 0;
      if (sw.totalMaxMarks > 0 && sw.percentage < lowestPercentage) {
        lowestPercentage = sw.percentage;
        weakSubject = {
          subjectId: sw.subjectId,
          subjectName: sw.subjectName,
          percentage: sw.percentage,
        };
      }
    }

    const overallPercentage = grandTotalMax > 0 ? Math.round((grandTotal / grandTotalMax) * 100 * 100) / 100 : 0;

    // Calculate rank in class
    // Get all students in the class with their total marks
    const classStudents = await db.student.findMany({
      where: { classId: student.classId },
      include: {
        marks: {
          where: {
            testId: { in: tests.map((t) => t.id) },
          },
        },
      },
    });

    const studentTotals = classStudents.map((s) => ({
      studentId: s.id,
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

    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        name: student.user.name,
        username: student.user.username,
        rollNo: student.rollNo,
        class: { id: student.class.id, name: student.class.name },
      },
      subjectWise: Object.values(subjectWise),
      testWise,
      totalMarks: grandTotal,
      totalMaxMarks: grandTotalMax,
      percentage: overallPercentage,
      rank,
      totalStudents: classStudents.length,
      weakSubject,
    });
  } catch (error) {
    console.error('Get student results error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
