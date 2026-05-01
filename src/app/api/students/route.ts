import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, queryToObj, docToObj, type StudentDoc, type SubjectDoc } from '@/lib/firebase-admin';
import { adminStudentsService } from '@/lib/firebase-admin-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');

    const db = await getAdminDb();

    // Get students
    let studentsSnap;
    if (classId) {
      studentsSnap = await db.collection('students').where('classId', '==', classId).get();
    } else {
      studentsSnap = await db.collection('students').orderBy('rollNo').get();
    }

    const students = queryToObj<StudentDoc>(studentsSnap);
    // Sort by rollNo in JS to avoid Firestore composite index requirement
    if (classId) {
      students.sort((a, b) => (a.rollNo || '').localeCompare(b.rollNo || '', undefined, { numeric: true }));
    }

    // Get all subjects for resolving names
    const subjectsSnap = await db.collection('subjects').orderBy('name').get();
    const allSubjects = queryToObj<SubjectDoc>(subjectsSnap);

    // Transform to match the existing interface expected by components
    const transformed = students.map(s => ({
      id: s.id,
      rollNo: s.rollNo,
      user: { id: s.userId, username: s.username, name: s.name },
      class: { id: s.classId, name: s.className },
      studentSubjects: s.subjectIds?.map(sid => {
        const sub = allSubjects.find(as => as.id === sid);
        return {
          subjectId: sid,
          subject: { id: sid, name: sub?.name || '', classId: sub?.classId || s.classId },
        };
      }) || [],
    }));

    return NextResponse.json({ success: true, students: transformed });
  } catch (error) {
    console.error('Get students error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, name, classId, rollNo, subjectIds } = body;

    if (!username || !password || !name || !classId || !rollNo) {
      return NextResponse.json(
        { success: false, message: 'All fields are required: username, password, name, classId, rollNo' },
        { status: 400 }
      );
    }

    const student = await adminStudentsService.create({ username, password, name, classId, rollNo, subjectIds });

    return NextResponse.json({ success: true, student }, { status: 201 });
  } catch (error) {
    console.error('Create student error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('already exists') ? 409 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}
