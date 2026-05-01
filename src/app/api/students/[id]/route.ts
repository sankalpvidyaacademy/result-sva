import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, docToObj, type StudentDoc, type SubjectDoc } from '@/lib/firebase-admin';
import { adminStudentsService } from '@/lib/firebase-admin-service';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const db = await getAdminDb();
    const studentSnap = await db.collection('students').doc(id).get();

    if (!studentSnap.exists) {
      return NextResponse.json(
        { success: false, message: 'Student not found' },
        { status: 404 }
      );
    }

    const student = docToObj<StudentDoc>(studentSnap);

    // Get subjects for this student
    const studentSubjects = [];
    for (const subjectId of student.subjectIds || []) {
      const subSnap = await db.collection('subjects').doc(subjectId).get();
      if (subSnap.exists) {
        const sub = docToObj<SubjectDoc>(subSnap);
        studentSubjects.push({
          subjectId: sub.id,
          subject: { id: sub.id, name: sub.name, classId: sub.classId },
        });
      }
    }

    const result = {
      id: student.id,
      rollNo: student.rollNo,
      user: { id: student.userId, username: student.username, name: student.name },
      class: { id: student.classId, name: student.className },
      studentSubjects,
    };

    return NextResponse.json({ success: true, student: result });
  } catch (error) {
    console.error('Get student error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Internal server error' },
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
    const { name, classId, rollNo, subjectIds } = body;

    const student = await adminStudentsService.update(id, { name, classId, rollNo, subjectIds });

    return NextResponse.json({ success: true, student });
  } catch (error) {
    console.error('Update student error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('not found') ? 404 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await adminStudentsService.delete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete student error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('not found') ? 404 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}
