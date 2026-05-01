import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, docToObj, queryToObj, type ClassDoc, type SubjectDoc, type TestDoc, type MarksDoc, type StudentDoc } from '@/lib/firebase-admin';

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
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params;
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');

    const db = await getAdminDb();

    const classSnap = await db.collection('classes').doc(classId).get();
    if (!classSnap.exists) {
      return NextResponse.json(
        { success: false, message: 'Class not found' },
        { status: 404 }
      );
    }
    const classData = docToObj<ClassDoc>(classSnap);

    // Get subjects
    const subjectsSnap = await db.collection('subjects').where('classId', '==', classId).get();
    const subjects = queryToObj<SubjectDoc>(subjectsSnap);
    // Sort by name in JS to avoid Firestore composite index requirement
    subjects.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    // Get completed tests, filtered by date range
    const today = new Date().toISOString().split('T')[0];
    const testsSnap = await db.collection('tests').where('classId', '==', classId).get();
    let tests = queryToObj<TestDoc>(testsSnap).filter(t => t.date <= today);
    // Sort by date ascending in JS to avoid Firestore composite index requirement
    tests.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    if (fromDate) tests = tests.filter(t => t.date >= fromDate);
    if (toDate) tests = tests.filter(t => t.date <= toDate);

    const totalMaxMarks = tests.reduce((sum, t) => sum + t.maxMarks, 0);

    // Get students
    const studentsSnap = await db.collection('students').where('classId', '==', classId).get();
    const students = queryToObj<StudentDoc>(studentsSnap);
    // Sort by rollNo in JS to avoid Firestore composite index requirement
    students.sort((a, b) => (a.rollNo || '').localeCompare(b.rollNo || '', undefined, { numeric: true }));

    // Get all marks for tests
    const allMarks: MarksDoc[] = [];
    for (const test of tests) {
      const marksSnap = await db.collection('marks').where('testId', '==', test.id).get();
      for (const markDoc of marksSnap.docs) {
        allMarks.push(docToObj<MarksDoc>(markDoc));
      }
    }

    // Build student results
    const studentResults = students.map(student => {
      let totalMarks = 0;
      const subjectMarks: Record<string, number> = {};
      const testMarks: Record<string, number> = {};

      for (const test of tests) {
        const markEntry = allMarks.find(m => m.testId === test.id && m.studentId === student.id);
        const obtainedMarks = markEntry ? markEntry.marks : 0;
        totalMarks += obtainedMarks;
        subjectMarks[test.subjectId] = (subjectMarks[test.subjectId] || 0) + obtainedMarks;
        testMarks[test.id] = obtainedMarks;
      }

      const percentage = totalMaxMarks > 0 ? Math.round((totalMarks / totalMaxMarks) * 100 * 100) / 100 : 0;

      return {
        studentId: student.id,
        rollNo: student.rollNo,
        name: student.name,
        subjectMarks,
        testMarks,
        totalMarks,
        percentage,
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

    // Class statistics
    const totalStudents = studentResults.length;
    const avgPercentage = totalStudents > 0
      ? Math.round(studentResults.reduce((sum, s) => sum + s.percentage, 0) / totalStudents * 100) / 100
      : 0;
    const highestMarks = studentResults.length > 0 ? studentResults[0].totalMarks : 0;
    const lowestMarks = studentResults.length > 0 ? studentResults[studentResults.length - 1].totalMarks : 0;

    // Subject-wise class averages
    const subjectAverages = subjects.map(subject => {
      const subjectTestIds = tests.filter(t => t.subjectId === subject.id);
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
    const gradeDistribution: Record<string, number> = {};
    for (const sr of studentResults) {
      const grade = getGrade(sr.percentage);
      gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1;
    }

    return NextResponse.json({
      success: true,
      report: {
        class: { id: classData.id, name: classData.name },
        subjects,
        tests: tests.map(t => ({
          id: t.id,
          name: t.name,
          date: t.date,
          maxMarks: t.maxMarks,
          subject: { id: t.subjectId, name: t.subjectName },
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
      { success: false, message: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
