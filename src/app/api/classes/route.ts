import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, queryToObj, type ClassDoc, type SubjectDoc } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const withSubjects = searchParams.get('withSubjects') === 'true';

    const db = await getAdminDb();

    // Get all classes ordered by name
    const classesSnap = await db.collection('classes').orderBy('name').get();
    const classes = queryToObj<ClassDoc>(classesSnap);

    if (withSubjects) {
      // Get all subjects ordered by name
      const subjectsSnap = await db.collection('subjects').orderBy('name').get();
      const allSubjects = queryToObj<SubjectDoc>(subjectsSnap);

      // Attach subjects to their classes
      for (const cls of classes) {
        (cls as ClassDoc & { subjects?: SubjectDoc[] }).subjects = allSubjects.filter(s => s.classId === cls.id);
      }
    }

    return NextResponse.json({ success: true, classes });
  } catch (error) {
    console.error('Get classes error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
