import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getSessionUser } from '@/lib/auth';
import { cookies } from 'next/headers';

/**
 * DELETE /api/users/me
 * Hard-deletes the authenticated user's account and removes them from all trips.
 * Also clears the session cookie.
 */
export async function DELETE(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json(
        { error: { code: 'AUTH_REQUIRED', message: 'Authentication required.' } },
        { status: 401 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    const filter = ObjectId.isValid(user.id)
      ? { _id: new ObjectId(user.id) }
      : { id: user.id };

    // 1. Remove user from all trips they are a member of
    await db.collection('trips').updateMany(
      { memberIds: user.id },
      { $pull: { memberIds: user.id } as any }
    );

    // 2. Delete the user document
    const result = await db.collection('users').deleteOne(filter);
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'User not found.' } }, { status: 404 });
    }

    // 3. Clear the session cookie
    const cookieStore = await cookies();
    cookieStore.delete('yatrasarthi_session');

    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    console.error('[DELETE /users/me] Error:', error);
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to delete account.' } }, { status: 500 });
  }
}
