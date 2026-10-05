import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getSessionUser } from '@/lib/auth';
import { publishTripEvent, appendEventLog } from '@/lib/realtime';

/**
 * POST /api/actions/:id/report-failure
 * Body: { reason?: string }
 *
 * Transitions state to 'failed'. UI re-plans from here (back to GET /recovery-options).
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

    let body: { reason?: string } = {};
    try {
      body = await request.json();
    } catch {
      // body is optional
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
        state: 'failed',
        failureReason: body.reason ?? null,
        updatedAt: now,
        version: (action.version ?? 0) + 1,
      },
    });

    await appendEventLog(db, {
      tripId: action.tripId,
      actor: user.id,
      type: 'action.state_changed',
      payload: { actionId, from: action.state, to: 'failed', reason: body.reason ?? null },
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
    console.error('[POST /api/actions/:id/report-failure]', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Failed to report failure.' } },
      { status: 500 }
    );
  }
}
