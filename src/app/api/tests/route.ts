import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, queryToObj, docToObj, type TestDoc, type MarksDoc } from '@/lib/firebase-admin';
import { adminTestsService } from '@/lib/firebase-admin-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const teacherId = searchParams.get('teacherId');

    const db = await getAdminDb();

    let testsSnap;
    if (classId) {
      testsSnap = await db.collection('tests').where('classId', '==', classId).orderBy('date', 'desc').get();
    } else if (teacherId) {
      testsSnap = await db.collection('tests').where('teacherId', '==', teacherId).orderBy('date', 'desc').get();
    } else {
      testsSnap = await db.collection('tests').orderBy('date', 'desc').get();
    }

    const today = new Date().toISOString().split('T')[0];
    const tests = queryToObj<TestDoc>(testsSnap);

    const formatted = await Promise.all(tests.map(async test => {
      let status: string;
      if (test.date === today) {
        status = 'Today';
      } else if (test.date > today) {
        status = 'Upcoming';
      } else {
        status = 'Completed';
      }

      // Get marks count for this test
      const marksSnap = await db.collection('marks').where('testId', '==', test.id).get();

      return {
        id: test.id,
        name: test.name,
        date: test.date,
        maxMarks: test.maxMarks,
        status,
        subject: { id: test.subjectId, name: test.subjectName },
        class: { id: test.classId, name: test.className },
        teacher: { id: test.teacherId, name: test.teacherName },
        marksCount: marksSnap.size,
      };
    }));

    return NextResponse.json({ success: true, tests: formatted });
  } catch (error) {
    console.error('Get tests error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, classId, subjectId, teacherId, date, maxMarks } = body;

    if (!name || !classId || !subjectId || !teacherId || !date || !maxMarks) {
      return NextResponse.json(
        { success: false, message: 'All fields are required: name, classId, subjectId, teacherId, date, maxMarks' },
        { status: 400 }
      );
    }

    if (maxMarks <= 0) {
      return NextResponse.json(
        { success: false, message: 'maxMarks must be a positive number' },
        { status: 400 }
      );
    }

    const test = await adminTestsService.create({ name, classId, subjectId, teacherId, date, maxMarks });

    return NextResponse.json({ success: true, test }, { status: 201 });
  } catch (error) {
    console.error('Create test error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('already scheduled') || message.includes('gap required') ? 409 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}
