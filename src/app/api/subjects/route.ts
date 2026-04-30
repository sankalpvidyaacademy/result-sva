import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, queryToObj, type SubjectDoc } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');

    const db = await getAdminDb();

    let subjectsSnap;
    if (classId) {
      subjectsSnap = await db.collection('subjects').where('classId', '==', classId).get();
    } else {
      subjectsSnap = await db.collection('subjects').orderBy('name').get();
    }

    const subjects = queryToObj<SubjectDoc>(subjectsSnap);
    // Sort client-side to avoid composite index requirement
    if (classId) {
      subjects.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return NextResponse.json({ success: true, subjects });
  } catch (error) {
    console.error('Get subjects error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
