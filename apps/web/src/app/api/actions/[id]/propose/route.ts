import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getSessionUser } from '@/lib/auth';
import { publishTripEvent, appendEventLog } from '@/lib/realtime';

/**
 * POST /api/actions/:id/propose
 * Body: { tripId, optionId, disruptionId, costTotal, membersToCharge: [{ memberId, amount }] }
 *
 * Creates an action in 'proposed' state with a proper agreements[] array (one entry per trip member),
 * all set to 'pending'. Also broadcasts the event via Ably and writes to the event log.
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
    const { tripId, optionId, disruptionId, costTotal, membersToCharge } = body;

    if (!tripId || !optionId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'tripId and optionId are required.' } },
        { status: 422 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // Load the trip to get its full member list (so agreements[] covers everyone)
    const trip = await db.collection('trips').findOne({ _id: new ObjectId(tripId) });
    if (!trip) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Trip not found.' } }, { status: 404 });
    }

    const memberIds: string[] = trip.memberIds ?? [];

    const now = new Date().toISOString();
    const actionDoc = {
      tripId,
      disruptionId: disruptionId ?? null,
      optionId,
      state: 'proposed',
      confirmType: null,
      proofRef: null,
      proposedBy: user.id,
      costTotal: costTotal ?? 0,
      // One agreement entry per trip member — all start as 'pending'
      agreements: memberIds.map((memberId: string) => ({
        memberId,
        response: 'pending' as const,
        respondedAt: null,
      })),
      membersToCharge: membersToCharge ?? [],
      vendorDraft: null,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };

    const result = await db.collection('actions').insertOne(actionDoc);
    const actionId = result.insertedId.toString();

    // Publish realtime event + append to event log
    await Promise.all([
      publishTripEvent(tripId, { type: 'action.updated', entityId: actionId, version: 1 }),
      appendEventLog(db, {
        tripId,
        actor: user.id,
        type: 'action.proposed',
        payload: { actionId, optionId, costTotal: costTotal ?? 0 },
      }),
    ]);

    return NextResponse.json(
      { data: { action: { id: actionId, ...actionDoc } } },
      { status: 201 }
    );
  } catch (error) {
    console.error('[propose] Failed to propose action:', error);
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to propose action.' } }, { status: 500 });
  }
}
