import { NextRequest, NextResponse } from 'next/server';
import { adminMarksService } from '@/lib/firebase-admin-service';

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

    await adminMarksService.update(id, marks);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update mark error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('not found') ? 404 : message.includes('exceed') || message.includes('negative') ? 400 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}
