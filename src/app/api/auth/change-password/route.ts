import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, getFieldValue, docToObj, type UserDoc } from '@/lib/firebase-admin';

// Change password route - uses Firebase Admin SDK to update password in Firestore
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

    const db = await getAdminDb();
    const FieldValue = await getFieldValue();

    // Get user document
    const userSnap = await db.collection('users').doc(userId).get();

    if (!userSnap.exists) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const user = docToObj<UserDoc>(userSnap);

    // Validate current password
    if (user.password !== currentPassword) {
      return NextResponse.json(
        { success: false, message: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    // Update password using Admin SDK
    await db.collection('users').doc(userId).update({
      password: newPassword,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
