import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');

    const where: Record<string, string> = {};
    if (classId) {
      where.classId = classId;
    }

    const subjects = await db.subject.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        class: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ success: true, subjects });
  } catch (error) {
    console.error('Get subjects error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
