import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { marks } = body;

    if (marks === undefined || marks === null) {
      return NextResponse.json(
        { success: false, message: 'marks is required' },
        { status: 400 }
      );
    }

    const existingMark = await db.marks.findUnique({
      where: { id },
      include: { test: true },
    });

    if (!existingMark) {
      return NextResponse.json(
        { success: false, message: 'Mark entry not found' },
        { status: 404 }
      );
    }

    if (marks > existingMark.test.maxMarks) {
      return NextResponse.json(
        { success: false, message: `Marks ${marks} exceed max marks ${existingMark.test.maxMarks}` },
        { status: 400 }
      );
    }

    if (marks < 0) {
      return NextResponse.json(
        { success: false, message: 'Marks cannot be negative' },
        { status: 400 }
      );
    }

    const updated = await db.marks.update({
      where: { id },
      data: { marks },
      include: {
        test: {
          select: { id: true, name: true, maxMarks: true },
        },
        student: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
    });

    return NextResponse.json({ success: true, mark: updated });
  } catch (error) {
    console.error('Update mark error:', error);
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

    const mark = await db.marks.findUnique({
      where: { id },
    });

    if (!mark) {
      return NextResponse.json(
        { success: false, message: 'Mark entry not found' },
        { status: 404 }
      );
    }

    await db.marks.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete mark error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
