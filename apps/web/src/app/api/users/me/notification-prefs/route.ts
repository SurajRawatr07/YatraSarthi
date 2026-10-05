import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getSessionUser } from '@/lib/auth';

// PUT /api/users/me/notification-prefs
// Body: Partial<User["notificationPrefs"]>
// Server enforces: disruptionAlerts can only be "on" | "quiet" — never fully disabled (safety rule)
export async function PUT(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: { code: 'AUTH_REQUIRED', message: 'Not authenticated' } }, { status: 401 });
    }

    const body = await request.json();

    // Server-side enforcement: disruptionAlerts can only be "on" or "quiet" — per I2's rule
    if (body.disruptionAlerts !== undefined && body.disruptionAlerts !== 'on' && body.disruptionAlerts !== 'quiet') {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'disruptionAlerts must be "on" or "quiet" — it can never be fully disabled.',
            details: { disruptionAlerts: 'Accepted values: "on" | "quiet"' },
          },
        },
        { status: 422 }
      );
    }

    // Merge incoming partial prefs with existing ones
    const existing = user.notificationPrefs ?? {
      disruptionAlerts: 'on',
      phantomWarnings: true,
      paymentRequests: true,
      groupActivity: true,
    };

    const merged = {
      disruptionAlerts: body.disruptionAlerts ?? existing.disruptionAlerts,
      phantomWarnings: body.phantomWarnings ?? existing.phantomWarnings,
      paymentRequests: body.paymentRequests ?? existing.paymentRequests,
      groupActivity: body.groupActivity ?? existing.groupActivity,
    };

    const client = await clientPromise;
    const db = client.db();

    const filter = { $or: [{ id: user.id }, { phone: user.phone }] } as any;
    await db.collection('users').updateOne(filter, {
      $set: { notificationPrefs: merged, updatedAt: new Date().toISOString() },
    });

    return NextResponse.json({ data: { notificationPrefs: merged } });
  } catch (err) {
    console.error('users/me/notification-prefs PUT error', err);
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to update notification preferences' } }, { status: 500 });
  }
}
