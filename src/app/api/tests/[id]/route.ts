import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, docToObj, type TestDoc, type MarksDoc } from '@/lib/firebase-admin';
import { adminTestsService } from '@/lib/firebase-admin-service';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const db = await getAdminDb();
    const testSnap = await db.collection('tests').doc(id).get();

    if (!testSnap.exists) {
      return NextResponse.json(
        { success: false, message: 'Test not found' },
        { status: 404 }
      );
    }

    const test = docToObj<TestDoc>(testSnap);

    const today = new Date().toISOString().split('T')[0];
    let status: string;
    if (test.date === today) {
      status = 'Today';
    } else if (test.date > today) {
      status = 'Upcoming';
    } else {
      status = 'Completed';
    }

    // Get marks for this test
    const marksSnap = await db.collection('marks').where('testId', '==', id).orderBy('studentRollNo').get();
    const marks = marksSnap.docs.map(d => {
      const m = docToObj<MarksDoc>(d);
      return {
        id: m.id,
        marks: m.marks,
        student: {
          id: m.studentId,
          rollNo: m.studentRollNo,
          name: m.studentName,
        },
      };
    });

    const formatted = {
      id: test.id,
      name: test.name,
      date: test.date,
      maxMarks: test.maxMarks,
      status,
      subject: { id: test.subjectId, name: test.subjectName },
      class: { id: test.classId, name: test.className },
      teacher: { id: test.teacherId, name: test.teacherName },
      marks,
      marksCount: marks.length,
    };

    return NextResponse.json({ success: true, test: formatted });
  } catch (error) {
    console.error('Get test error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const db = await getAdminDb();
    const FieldValue = await import('@/lib/firebase-admin').then(m => m.getFieldValue());

    const testSnap = await db.collection('tests').doc(id).get();
    if (!testSnap.exists) {
      return NextResponse.json(
        { success: false, message: 'Test not found' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.date !== undefined) updateData.date = body.date;
    if (body.maxMarks !== undefined) updateData.maxMarks = body.maxMarks;

    if (Object.keys(updateData).length > 0) {
      const fv = await FieldValue;
      updateData.updatedAt = fv.serverTimestamp();
      await db.collection('tests').doc(id).update(updateData);
    }

    // Fetch updated test
    const updatedSnap = await db.collection('tests').doc(id).get();
    const updated = docToObj<TestDoc>(updatedSnap);

    const today = new Date().toISOString().split('T')[0];
    let status: string;
    if (updated.date === today) status = 'Today';
    else if (updated.date > today) status = 'Upcoming';
    else status = 'Completed';

    return NextResponse.json({
      success: true,
      test: {
        id: updated.id,
        name: updated.name,
        date: updated.date,
        maxMarks: updated.maxMarks,
        status,
        subject: { id: updated.subjectId, name: updated.subjectName },
        class: { id: updated.classId, name: updated.className },
        teacher: { id: updated.teacherId, name: updated.teacherName },
      },
    });
  } catch (error) {
    console.error('Update test error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await adminTestsService.delete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete test error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('not found') ? 404 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}
