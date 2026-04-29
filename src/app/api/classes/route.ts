import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const withSubjects = searchParams.get('withSubjects') === 'true';

    const classes = await db.class.findMany({
      orderBy: { name: 'asc' },
      include: withSubjects
        ? {
            subjects: {
              orderBy: { name: 'asc' },
            },
          }
        : false,
    });

    return NextResponse.json({ success: true, classes });
  } catch (error) {
    console.error('Get classes error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
