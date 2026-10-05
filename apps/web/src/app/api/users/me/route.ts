import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getSessionUser } from '@/lib/auth';

// GET /api/users/me — return the current user (I1)
// PUT /api/users/me — update name (phone is immutable post-verification)
// DELETE /api/users/me — anonymise account; block if user owns any active trip

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: { code: 'AUTH_REQUIRED', message: 'Not authenticated' } }, { status: 401 });
    }
    return NextResponse.json({ data: user });
  } catch (err) {
    console.error('users/me GET error', err);
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to fetch user' } }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: { code: 'AUTH_REQUIRED', message: 'Not authenticated' } }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'name is required and must be a non-empty string' } },
        { status: 422 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // Find user by id or phone (supports both real MongoDB _id and fallback id)
    const filter = { $or: [{ id: user.id }, { phone: user.phone }] } as any;
    await db.collection('users').updateOne(filter, {
      $set: { name: name.trim(), updatedAt: new Date().toISOString() },
    });

    // Return updated user
    const updated = await db.collection('users').findOne(filter);
    if (!updated) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'User not found' } }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        id: updated._id?.toString() ?? updated.id,
        phone: updated.phone,
        name: updated.name,
        whatsappOptIn: !!updated.whatsappOptIn,
        notificationPrefs: updated.notificationPrefs ?? {
          disruptionAlerts: 'on',
          phantomWarnings: true,
          paymentRequests: true,
          groupActivity: true,
        },
        emergencyContacts: updated.emergencyContacts ?? [],
        subscription: updated.subscription ?? { tier: 'free' },
        createdAt: updated.createdAt,
      },
    });
  } catch (err) {
    console.error('users/me PUT error', err);
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to update user' } }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: { code: 'AUTH_REQUIRED', message: 'Not authenticated' } }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db();

    // Block deletion if user owns any active trip — they must transfer or delete those first
    const ownedTrips = await db.collection('trips').find({ ownerId: user.id, status: { $ne: 'completed' } } as any).toArray();
    if (ownedTrips.length > 0) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: `You own ${ownedTrips.length} active trip(s). Delete or transfer them before deleting your account.`,
          },
        },
        { status: 403 }
      );
    }

    // Anonymise: strip name/phone from trips where user is a member (not owner)
    // Per I1 spec: "Trips shared with a group stay visible to other members, without your details."
    // We simply remove the userId from memberIds and leave a placeholder.
    await db.collection('trips').updateMany(
      { memberIds: user.id } as any,
      { $pull: { memberIds: user.id } } as any
    );

    // Delete the user document
    const filter = { $or: [{ id: user.id }, { phone: user.phone }] } as any;
    await db.collection('users').deleteOne(filter);

    // Clear session cookie by returning a Set-Cookie header that expires immediately
    const response = NextResponse.json({ data: { deleted: true } });
    response.cookies.set('yatrasarthi_session', '', { maxAge: 0, path: '/' });
    return response;
  } catch (err) {
    console.error('users/me DELETE error', err);
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to delete account' } }, { status: 500 });
  }
}
