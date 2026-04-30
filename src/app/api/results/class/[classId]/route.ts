import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, docToObj, queryToObj, type ClassDoc, type SubjectDoc, type TestDoc, type MarksDoc, type StudentDoc } from '@/lib/firebase-admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params;
    const db = await getAdminDb();

    // Verify class exists
    const classSnap = await db.collection('classes').doc(classId).get();
    if (!classSnap.exists) {
      return NextResponse.json(
        { success: false, message: 'Class not found' },
        { status: 404 }
      );
    }
    const classData = docToObj<ClassDoc>(classSnap);

    // Get subjects for this class
    const subjectsSnap = await db.collection('subjects').where('classId', '==', classId).orderBy('name').get();
    const subjects = queryToObj<SubjectDoc>(subjectsSnap);

    // Get completed tests for this class
    const today = new Date().toISOString().split('T')[0];
    const testsSnap = await db.collection('tests').where('classId', '==', classId).orderBy('date', 'asc').get();
    const allTests = queryToObj<TestDoc>(testsSnap);
    const tests = allTests.filter(t => t.date <= today);

    if (tests.length === 0) {
      return NextResponse.json({
        success: true,
        class: { id: classData.id, name: classData.name },
        subjects,
        tests: [],
        totalMaxMarks: 0,
        students: [],
      });
    }

    const totalMaxMarks = tests.reduce((sum, t) => sum + t.maxMarks, 0);

    // Get all students in the class
    const studentsSnap = await db.collection('students').where('classId', '==', classId).orderBy('rollNo').get();
    const students = queryToObj<StudentDoc>(studentsSnap);

    // Get all marks for these tests
    const allMarks: MarksDoc[] = [];
    for (const test of tests) {
      const marksSnap = await db.collection('marks').where('testId', '==', test.id).get();
      for (const markDoc of marksSnap.docs) {
        allMarks.push(docToObj<MarksDoc>(markDoc));
      }
    }

    // Build result data
    const studentResults = students.map(student => {
      const subjectMarks: Record<string, { marks: number; maxMarks: number; testName: string }> = {};
      let totalMarks = 0;

      for (const test of tests) {
        const markEntry = allMarks.find(m => m.testId === test.id && m.studentId === student.id);
        const obtainedMarks = markEntry ? markEntry.marks : 0;
        totalMarks += obtainedMarks;

        subjectMarks[test.subjectId] = {
          marks: obtainedMarks,
          maxMarks: test.maxMarks,
          testName: test.name,
        };
      }

      const percentage = totalMaxMarks > 0 ? Math.round((totalMarks / totalMaxMarks) * 100 * 100) / 100 : 0;

      // Find weak subject
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
              subjectName: test.subjectName,
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
        name: student.name,
        subjectMarks,
        totalMarks,
        totalMaxMarks,
        percentage,
        weakSubject,
        testsTaken: allMarks.filter(m => m.studentId === student.id).length,
      };
    });

    // Sort by total marks for ranking
    studentResults.sort((a, b) => b.totalMarks - a.totalMarks);
    let currentRank = 1;
    for (let i = 0; i < studentResults.length; i++) {
      if (i > 0 && studentResults[i].totalMarks < studentResults[i - 1].totalMarks) {
        currentRank = i + 1;
      }
      (studentResults[i] as { rank: number }).rank = currentRank;
    }

    return NextResponse.json({
      success: true,
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
