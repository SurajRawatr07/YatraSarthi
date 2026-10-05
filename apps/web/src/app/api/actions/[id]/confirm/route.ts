import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getSessionUser } from '@/lib/auth';
import { publishTripEvent, appendEventLog } from '@/lib/realtime';

/**
 * POST /api/actions/:id/confirm
 * Body: { confirmType: 'self_reported' | 'vendor_verified'; proofRef?: string }
 *
 * Marks the action as confirmed (state → 'confirmed'), records confirmType and optional proofRef,
 * then checks if all trip actions are now confirmed to flip the trip back to 'healthy'.
 * Publishes realtime event and writes to event log.
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
    const { confirmType, proofRef } = body as {
      confirmType: 'self_reported' | 'vendor_verified';
      proofRef?: string;
    };

    if (!confirmType || !['self_reported', 'vendor_verified'].includes(confirmType)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'confirmType must be self_reported or vendor_verified.' } },
        { status: 422 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // Find the action — try ObjectId first, then string id field
    let action: any = null;
    if (ObjectId.isValid(id)) {
      action = await db.collection('actions').findOne({ _id: new ObjectId(id) });
    }
    if (!action) {
      action = await db.collection('actions').findOne({ id });
    }
    if (!action) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Action not found.' } }, { status: 404 });
    }

    const now = new Date().toISOString();
    const update: Record<string, any> = {
      state: 'confirmed',
      confirmType,
      confirmedAt: now,
      updatedAt: now,
    };
    if (proofRef) update.proofRef = proofRef;

    const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id };
    await db.collection('actions').updateOne(filter, { $set: update });

    // Check if all actions for this trip are now confirmed → flip trip to healthy
    const tripId: string = action.tripId;
    const pendingActions = await db.collection('actions').countDocuments({
      tripId,
      state: { $nin: ['confirmed', 'failed'] },
    });

    if (pendingActions === 0) {
      await db.collection('trips').updateOne(
        { _id: new ObjectId(tripId) },
        { $set: { status: 'healthy', healthScore: 100 } }
      );
      await publishTripEvent(tripId, { type: 'trip.updated', entityId: tripId });
    }

    await Promise.all([
      publishTripEvent(tripId, { type: 'action.updated', entityId: id }),
      appendEventLog(db, {
        tripId,
        actor: user.id,
        type: 'action.confirmed',
        payload: { actionId: id, confirmType, proofRef: proofRef ?? null },
      }),
    ]);

    return NextResponse.json({ data: { actionId: id, state: 'confirmed', confirmType } });
  } catch (error) {
    console.error('[confirm] Failed to confirm action:', error);
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to confirm action.' } }, { status: 500 });
  }
}
