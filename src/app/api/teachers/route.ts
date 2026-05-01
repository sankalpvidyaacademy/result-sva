import { NextResponse } from 'next/server';
import { getAdminDb, queryToObj, type TeacherDoc } from '@/lib/firebase-admin';
import { adminTeachersService } from '@/lib/firebase-admin-service';

export async function GET() {
  try {
    const db = await getAdminDb();
    const teachersSnap = await db.collection('teachers').orderBy('name').get();
    const teachers = queryToObj<TeacherDoc>(teachersSnap);

    // Transform to match the existing interface
    const formatted = teachers.map(teacher => ({
      id: teacher.id,
      userId: teacher.userId,
      user: { id: teacher.userId, username: teacher.username, name: teacher.name },
      subjects: teacher.subjects || [],
    }));

    return NextResponse.json({ success: true, teachers: formatted });
  } catch (error) {
    console.error('Get teachers error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password, name, subjects } = body;

    if (!username || !password || !name) {
      return NextResponse.json(
        { success: false, message: 'Username, password, and name are required' },
        { status: 400 }
      );
    }

    if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
      return NextResponse.json(
        { success: false, message: 'At least one subject assignment is required' },
        { status: 400 }
      );
    }

    const teacher = await adminTeachersService.create({ username, password, name, subjects });

    return NextResponse.json({ success: true, teacher }, { status: 201 });
  } catch (error) {
    console.error('Create teacher error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('already exists') ? 409 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}
