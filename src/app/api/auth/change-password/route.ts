import { NextRequest, NextResponse } from 'next/server';

// Change password route - delegated to Firebase client-side
// This is a passthrough that validates the request format
// Actual password change happens client-side via Firebase
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, currentPassword, newPassword } = body;

    if (!userId || !currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, message: 'userId, currentPassword, and newPassword are required' },
        { status: 400 }
      );
    }

    // Password change is handled client-side via Firebase service
    // This route exists for API compatibility
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
