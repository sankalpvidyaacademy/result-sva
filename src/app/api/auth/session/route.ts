import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('sankalp_session');

    if (!sessionCookie?.value) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const session = JSON.parse(sessionCookie.value);

    return NextResponse.json({
      success: true,
      user: {
        userId: session.userId,
        role: session.role,
        name: session.name,
      },
    });
  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json(
      { success: false, message: 'Invalid session' },
      { status: 401 }
    );
  }
}
