import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, docToObj, type TeacherDoc } from '@/lib/firebase-admin';
import { adminTeachersService } from '@/lib/firebase-admin-service';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const db = await getAdminDb();
    const teacherSnap = await db.collection('teachers').doc(id).get();

    if (!teacherSnap.exists) {
      return NextResponse.json(
        { success: false, message: 'Teacher not found' },
        { status: 404 }
      );
    }

    const teacher = docToObj<TeacherDoc>(teacherSnap);

    const formatted = {
      id: teacher.id,
      userId: teacher.userId,
      user: { id: teacher.userId, username: teacher.username, name: teacher.name },
      subjects: teacher.subjects || [],
    };

    return NextResponse.json({ success: true, teacher: formatted });
  } catch (error) {
    console.error('Get teacher error:', error);
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
    const { name, subjects } = body;

    const teacher = await adminTeachersService.update(id, { name, subjects });

    return NextResponse.json({ success: true, teacher });
  } catch (error) {
    console.error('Update teacher error:', error);
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
    await adminTeachersService.delete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete teacher error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('not found') ? 404 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}
