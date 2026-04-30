import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, docToObj, type UserDoc } from '@/lib/firebase-admin';

// Login route - validates credentials via Firebase Admin SDK and sets session cookie
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, role } = body;

    if (!username || !password || !role) {
      return NextResponse.json(
        { success: false, message: 'username, password, and role are required' },
        { status: 400 }
      );
    }

    const db = await getAdminDb();

    // Find user by username
    const userSnap = await db.collection('users').where('username', '==', username).get();

    if (userSnap.empty) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const user = docToObj<UserDoc>(userSnap.docs[0]);

    // Validate password and role
    if (user.password !== password || user.role !== role) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const sessionData = JSON.stringify({
      userId: user.id,
      role: user.role,
      name: user.name,
    });

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, username: user.username, role: user.role, name: user.name },
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
