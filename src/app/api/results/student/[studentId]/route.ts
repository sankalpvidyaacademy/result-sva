import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, docToObj, queryToObj, type StudentDoc, type SubjectDoc, type TestDoc, type MarksDoc } from '@/lib/firebase-admin';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await params;
    const db = await getAdminDb();

    const studentSnap = await db.collection('students').doc(studentId).get();
    if (!studentSnap.exists) {
      return NextResponse.json(
        { success: false, message: 'Student not found' },
        { status: 404 }
      );
    }
    const student = docToObj<StudentDoc>(studentSnap);

    // Get subjects for this class
    const subjectsSnap = await db.collection('subjects').where('classId', '==', student.classId).get();
    const subjects = queryToObj<SubjectDoc>(subjectsSnap);
    // Sort by name in JS to avoid Firestore composite index requirement
    subjects.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    // Get completed tests for this class
    const today = new Date().toISOString().split('T')[0];
    const testsSnap = await db.collection('tests').where('classId', '==', student.classId).get();
    const allTests = queryToObj<TestDoc>(testsSnap);
    // Sort by date ascending in JS to avoid Firestore composite index requirement
    allTests.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const tests = allTests.filter(t => t.date <= today);

    // Get student's marks
    const marksSnap = await db.collection('marks').where('studentId', '==', studentId).get();
    const studentMarks = queryToObj<MarksDoc>(marksSnap);

    // Build subject-wise marks
    const subjectWise: Record<string, {
      subjectId: string; subjectName: string
      tests: { testId: string; testName: string; date: string; marks: number; maxMarks: number }[]
      totalMarks: number; totalMaxMarks: number; percentage: number
    }> = {};

    for (const subject of subjects) {
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

    const testWise: {
      testId: string; testName: string; date: string
      subjectId: string; subjectName: string
      marks: number; maxMarks: number
    }[] = [];

    for (const test of tests) {
      const markEntry = studentMarks.find(m => m.testId === test.id);
      const obtainedMarks = markEntry ? markEntry.marks : 0;

      testWise.push({
        testId: test.id,
        testName: test.name,
        date: test.date,
        subjectId: test.subjectId,
        subjectName: test.subjectName,
        marks: obtainedMarks,
        maxMarks: test.maxMarks,
      });

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
    const classStudentsSnap = await db.collection('students').where('classId', '==', student.classId).get();
    const classStudentIds = classStudentsSnap.docs.map(d => d.id);

    const classMarks: { studentId: string; marks: number }[] = [];
    for (const test of tests) {
      const testMarksSnap = await db.collection('marks').where('testId', '==', test.id).get();
      for (const markDoc of testMarksSnap.docs) {
        const m = docToObj<MarksDoc>(markDoc);
        const existing = classMarks.find(cm => cm.studentId === m.studentId);
        if (existing) {
          existing.marks += m.marks;
        } else {
          classMarks.push({ studentId: m.studentId, marks: m.marks });
        }
      }
    }

    for (const sid of classStudentIds) {
      if (!classMarks.find(cm => cm.studentId === sid)) {
        classMarks.push({ studentId: sid, marks: 0 });
      }
    }

    classMarks.sort((a, b) => b.marks - a.marks);
    let rank = 1;
    for (let i = 0; i < classMarks.length; i++) {
      if (i > 0 && classMarks[i].marks < classMarks[i - 1].marks) {
        rank = i + 1;
      }
      if (classMarks[i].studentId === studentId) {
        break;
      }
    }

    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        name: student.name,
        username: student.username,
        rollNo: student.rollNo,
        class: { id: student.classId, name: student.className },
      },
      subjectWise: Object.values(subjectWise),
      testWise,
      totalMarks: grandTotal,
      totalMaxMarks: grandTotalMax,
      percentage: overallPercentage,
      rank,
      totalStudents: classStudentIds.length,
      weakSubject,
    });
  } catch (error) {
    console.error('Get student results error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
