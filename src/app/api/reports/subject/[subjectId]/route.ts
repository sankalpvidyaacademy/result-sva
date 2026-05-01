import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, docToObj, queryToObj, type SubjectDoc, type TestDoc, type MarksDoc, type StudentDoc } from '@/lib/firebase-admin';

const getGrade = (pct: number): string => {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  if (pct >= 40) return 'D';
  return 'F';
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const { subjectId } = await params;
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');

    const db = await getAdminDb();

    const subjectSnap = await db.collection('subjects').doc(subjectId).get();
    if (!subjectSnap.exists) {
      return NextResponse.json(
        { success: false, message: 'Subject not found' },
        { status: 404 }
      );
    }
    const subject = docToObj<SubjectDoc>(subjectSnap);

    // Get tests for this subject, filtered by date range
    const today = new Date().toISOString().split('T')[0];
    const testsSnap = await db.collection('tests').where('subjectId', '==', subjectId).get();
    let tests = queryToObj<TestDoc>(testsSnap).filter(t => t.date <= today);
    // Sort by date ascending in JS to avoid Firestore composite index requirement
    tests.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    if (fromDate) tests = tests.filter(t => t.date >= fromDate);
    if (toDate) tests = tests.filter(t => t.date <= toDate);

    const totalMaxMarks = tests.reduce((sum, t) => sum + t.maxMarks, 0);

    // Get all students in the class
    const studentsSnap = await db.collection('students').where('classId', '==', subject.classId).get();
    const students = queryToObj<StudentDoc>(studentsSnap);
    // Sort by rollNo in JS to avoid Firestore composite index requirement
    students.sort((a, b) => (a.rollNo || '').localeCompare(b.rollNo || '', undefined, { numeric: true }));

    // Get marks for all tests
    const testMarks: Record<string, MarksDoc[]> = {};
    for (const test of tests) {
      const marksSnap = await db.collection('marks').where('testId', '==', test.id).get();
      testMarks[test.id] = queryToObj<MarksDoc>(marksSnap);
    }

    // Build per-student results for this subject
    const studentResults = students.map(student => {
      let totalMarks = 0;
      const testMarksList: { testId: string; testName: string; date: string; marks: number; maxMarks: number }[] = [];

      for (const test of tests) {
        const marks = testMarks[test.id] || [];
        const markEntry = marks.find(m => m.studentId === student.id);
        const obtainedMarks = markEntry ? markEntry.marks : 0;
        totalMarks += obtainedMarks;

        testMarksList.push({
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
        name: student.name,
        totalMarks,
        totalMaxMarks,
        percentage,
        testMarks: testMarksList,
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
    const testStatistics = tests.map(test => {
      const marks = testMarks[test.id] || [];
      const marksList = marks.map(m => m.marks);
      const avg = marksList.length > 0
        ? Math.round(marksList.reduce((sum, m) => sum + m, 0) / marksList.length * 100) / 100
        : 0;
      const highest = marksList.length > 0 ? Math.max(...marksList) : 0;
      const lowest = marksList.length > 0 ? Math.min(...marksList) : 0;
      const passCount = marksList.filter(m => m >= test.maxMarks * 0.4).length;
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
          class: { id: subject.classId, name: subject.className },
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
      { success: false, message: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
