import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, queryToObj, docToObj, type MarksDoc } from '@/lib/firebase-admin';
import { adminMarksService } from '@/lib/firebase-admin-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const testId = searchParams.get('testId');
    const studentId = searchParams.get('studentId');

    if (!testId && !studentId) {
      return NextResponse.json(
        { success: false, message: 'Either testId or studentId query parameter is required' },
        { status: 400 }
      );
    }

    const db = await getAdminDb();

    let marksSnap;
    if (testId) {
      marksSnap = await db.collection('marks').where('testId', '==', testId).get();
    } else {
      marksSnap = await db.collection('marks').where('studentId', '==', studentId!).get();
    }

    const formatted = marksSnap.docs.map(d => {
      const m = docToObj<MarksDoc>(d);
      return {
        id: m.id,
        marks: m.marks,
        test: {
          id: m.testId,
          name: m.testInfo.name,
          date: m.testInfo.date,
          maxMarks: m.testInfo.maxMarks,
          subject: { id: m.testInfo.subjectId, name: m.testInfo.subjectName },
          class: { id: m.testInfo.classId, name: m.testInfo.className },
        },
        student: {
          id: m.studentId,
          rollNo: m.studentRollNo,
          name: m.studentName,
          class: { id: m.testInfo.classId, name: m.testInfo.className },
        },
      };
    });
    // Sort by studentRollNo in JS to avoid Firestore composite index requirement
    if (testId) {
      formatted.sort((a, b) => (a.student.rollNo || '').localeCompare(b.student.rollNo || '', undefined, { numeric: true }));
    }

    return NextResponse.json({ success: true, marks: formatted });
  } catch (error) {
    console.error('Get marks error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { testId, entries } = body;

    if (!testId || !entries || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        { success: false, message: 'testId and entries array are required' },
        { status: 400 }
      );
    }

    const marks = await adminMarksService.create(testId, entries);

    return NextResponse.json(
      { success: true, marks, count: marks.length },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create marks error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
