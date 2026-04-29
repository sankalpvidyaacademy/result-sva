import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');

    const where: { classId?: string } = {};
    if (classId) {
      where.classId = classId;
    }

    const students = await db.student.findMany({
      where,
      orderBy: { rollNo: 'asc' },
      include: {
        user: {
          select: { id: true, username: true, name: true },
        },
        class: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ success: true, students });
  } catch (error) {
    console.error('Get students error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, name, classId, rollNo } = body;

    if (!username || !password || !name || !classId || !rollNo) {
      return NextResponse.json(
        { success: false, message: 'All fields are required: username, password, name, classId, rollNo' },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existingUser = await db.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Username already exists' },
        { status: 409 }
      );
    }

    // Check if class exists
    const classExists = await db.class.findUnique({
      where: { id: classId },
    });

    if (!classExists) {
      return NextResponse.json(
        { success: false, message: 'Class not found' },
        { status: 404 }
      );
    }

    // Create User + Student in a transaction
    const result = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username,
          password,
          role: 'STUDENT',
          name,
        },
      });

      const student = await tx.student.create({
        data: {
          userId: user.id,
          classId,
          rollNo,
        },
        include: {
          user: {
            select: { id: true, username: true, name: true },
          },
          class: {
            select: { id: true, name: true },
          },
        },
      });

      return student;
    });

    return NextResponse.json({ success: true, student: result }, { status: 201 });
  } catch (error) {
    console.error('Create student error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
