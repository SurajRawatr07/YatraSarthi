import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getSessionUser } from '@/lib/auth';
import { publishTripEvent, appendEventLog } from '@/lib/realtime';

/**
 * POST /api/actions/:id/respond
 * Body: { response: 'agreed' | 'declined'; suggestion?: string }
 *
 * Updates the caller's entry in agreements[], then checks if everyone agreed
 * to advance state to 'awaiting_payment' (costTotal > 0) or 'executing' (free).
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
    const { response, suggestion } = body as {
      response: 'agreed' | 'declined';
      suggestion?: string;
    };

    if (!['agreed', 'declined'].includes(response)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'response must be "agreed" or "declined".' } },
        { status: 422 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // Locate the action
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

    // Update the member's agreement entry
    const agreements: any[] = action.agreements ?? [];
    const memberIdx = agreements.findIndex((a: any) => a.memberId === user.id);
    if (memberIdx !== -1) {
      agreements[memberIdx] = { ...agreements[memberIdx], response, respondedAt: now };
    } else {
      agreements.push({ memberId: user.id, response, respondedAt: now });
    }

    // Determine new state
    const allAgreed = agreements.length > 0 && agreements.every((a: any) => a.response === 'agreed');
    let newState: string = action.state;

    if (allAgreed) {
      newState = (action.costTotal ?? 0) > 0 ? 'awaiting_payment' : 'executing';
    }

    const filter = action._id ? { _id: new ObjectId(actionId) } : { id: actionId };
    await db.collection('actions').updateOne(filter, {
      $set: {
        agreements,
        state: newState,
        updatedAt: now,
        version: (action.version ?? 0) + 1,
      },
    });

    // Log declined suggestion to event log
    if (response === 'declined') {
      await appendEventLog(db, {
        tripId: action.tripId,
        actor: user.id,
        type: 'action.declined',
        payload: { actionId, suggestion: suggestion ?? null },
      });
    }

    // Publish realtime event
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
    console.error('[POST /api/actions/:id/respond]', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Failed to record response.' } },
      { status: 500 }
    );
  }
}
