import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getSessionUser } from '@/lib/auth';
import { publishTripEvent } from '@/lib/realtime';

/**
 * POST /api/actions/:id/mark-sent
 * Body: { subject: string; body: string }
 *
 * Stores the (possibly-edited) vendor draft on the action, sets state → 'pending_vendor'.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json(
        { error: { code: 'AUTH_REQUIRED', message: 'Authentication required.' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { subject, body: emailBody } = body as { subject: string; body: string };

    if (!subject || !emailBody) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'subject and body are required.' } },
        { status: 422 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    let action: any = null;
    if (ObjectId.isValid(id)) {
      action = await db.collection('actions').findOne({ _id: new ObjectId(id) });
    }
    if (!action) {
      action = await db.collection('actions').findOne({ id });
    }

    if (!action) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Action not found.' } },
        { status: 404 }
      );
    }

    const actionId = action._id ? action._id.toString() : action.id;
    const now = new Date().toISOString();
    const filter = action._id ? { _id: new ObjectId(actionId) } : { id: actionId };

    await db.collection('actions').updateOne(filter, {
      $set: {
        vendorDraft: { subject, body: emailBody, sentAt: now, nudgedAt: [] },
        state: 'pending_vendor',
        updatedAt: now,
        version: (action.version ?? 0) + 1,
      },
    });

    await publishTripEvent(action.tripId, {
      type: 'action.updated',
      entityId: actionId,
      version: (action.version ?? 0) + 1,
    });

    const updated = await (action._id
      ? db.collection('actions').findOne({ _id: new ObjectId(actionId) })
      : db.collection('actions').findOne({ id: actionId }));

    const serialised = {
      ...updated,
      id: updated?._id ? updated._id.toString() : updated?.id,
      _id: undefined,
    };

    return NextResponse.json({ data: serialised });
  } catch (error) {
    console.error('[POST /api/actions/:id/mark-sent]', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Failed to mark email as sent.' } },
      { status: 500 }
    );
  }
}
