import { NextRequest, NextResponse } from 'next/server';

// Login route - sets session cookie
// Credential validation is done client-side via Firebase
// This route just sets the session cookie for server-side session persistence
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, role, name } = body;

    if (!userId || !role || !name) {
      return NextResponse.json(
        { success: false, message: 'userId, role, and name are required' },
        { status: 400 }
      );
    }

    const sessionData = JSON.stringify({
      userId,
      role,
      name,
    });

    const response = NextResponse.json({
      success: true,
      user: { id: userId, role, name },
    });

    response.cookies.set('sankalp_session', sessionData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
