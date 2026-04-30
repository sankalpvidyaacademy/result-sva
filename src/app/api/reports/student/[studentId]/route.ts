import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, docToObj, queryToObj, type StudentDoc, type SubjectDoc, type TestDoc, type MarksDoc } from '@/lib/firebase-admin';

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
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await params;
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');

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
    const subjectsSnap = await db.collection('subjects').where('classId', '==', student.classId).orderBy('name').get();
    const subjects = queryToObj<SubjectDoc>(subjectsSnap);

    // Get completed tests, filtered by date range
    const today = new Date().toISOString().split('T')[0];
    const testsSnap = await db.collection('tests').where('classId', '==', student.classId).orderBy('date', 'asc').get();
    let tests = queryToObj<TestDoc>(testsSnap).filter(t => t.date <= today);

    // Apply date filter
    if (fromDate) tests = tests.filter(t => t.date >= fromDate);
    if (toDate) tests = tests.filter(t => t.date <= toDate);

    // Get student's marks
    const marksSnap = await db.collection('marks').where('studentId', '==', studentId).get();
    const studentMarks = queryToObj<MarksDoc>(marksSnap);

    // Build subject summary
    const subjectSummary: Record<string, {
      subjectId: string; subjectName: string
      testsTaken: number; totalMarks: number; totalMaxMarks: number; percentage: number; grade: string
    }> = {};

    for (const subject of subjects) {
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
      const markEntry = studentMarks.find(m => m.testId === test.id);
      const obtainedMarks = markEntry ? markEntry.marks : 0;

      if (subjectSummary[test.subjectId]) {
        subjectSummary[test.subjectId].testsTaken += 1;
        subjectSummary[test.subjectId].totalMarks += obtainedMarks;
        subjectSummary[test.subjectId].totalMaxMarks += test.maxMarks;
      }

      grandTotal += obtainedMarks;
      grandTotalMax += test.maxMarks;
    }

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
    const classStudentsSnap = await db.collection('students').where('classId', '==', student.classId).get();
    const classStudentIds = classStudentsSnap.docs.map(d => d.id);

    const classMarks: { studentId: string; name: string; totalMarks: number }[] = [];
    for (const classStudentDoc of classStudentsSnap.docs) {
      const cs = docToObj<StudentDoc>(classStudentDoc);
      const csMarksSnap = await db.collection('marks').where('studentId', '==', cs.id).get();
      let total = 0;
      for (const markDoc of csMarksSnap.docs) {
        const m = docToObj<MarksDoc>(markDoc);
        if (tests.some(t => t.id === m.testId)) {
          total += m.marks;
        }
      }
      classMarks.push({ studentId: cs.id, name: cs.name, totalMarks: total });
    }

    classMarks.sort((a, b) => b.totalMarks - a.totalMarks);
    let rank = 1;
    for (let i = 0; i < classMarks.length; i++) {
      if (i > 0 && classMarks[i].totalMarks < classMarks[i - 1].totalMarks) {
        rank = i + 1;
      }
      if (classMarks[i].studentId === studentId) {
        break;
      }
    }

    // Test details with marks
    const testDetails = tests.map(test => {
      const markEntry = studentMarks.find(m => m.testId === test.id);
      const obtainedMarks = markEntry ? markEntry.marks : 0;
      const pct = test.maxMarks > 0 ? Math.round((obtainedMarks / test.maxMarks) * 100 * 100) / 100 : 0;

      return {
        testId: test.id,
        testName: test.name,
        date: test.date,
        subject: { id: test.subjectId, name: test.subjectName },
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
          name: student.name,
          username: student.username,
          rollNo: student.rollNo,
          class: { id: student.classId, name: student.className },
        },
        academicSummary: {
          totalMarks: grandTotal,
          totalMaxMarks: grandTotalMax,
          percentage: overallPercentage,
          grade: overallGrade,
          rank,
          totalStudents: classStudentIds.length,
          testsCompleted: tests.length,
          weakSubject,
        },
        subjectSummary: Object.values(subjectSummary),
        testDetails,
        dateRange: fromDate || toDate ? { from: fromDate || null, to: toDate || null } : null,
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
