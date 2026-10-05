import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getSessionUser } from '@/lib/auth';
import { publishTripEvent, appendEventLog } from '@/lib/realtime';

/**
 * POST /api/itinerary/apply-plan
 *
 * Applies a chosen recovery plan to the trip's nodes and edges, then calls
 * Person 3's graph-recompute endpoint to propagate the new topology.
 *
 * Body: {
 *   tripId: string,
 *   actionId: string,          // the confirmed action this plan belongs to
 *   optionId: string,          // e.g. 'opt_skip', 'opt_rebook', 'opt_phantom', 'opt_wait', 'opt_partial_reroute'
 *   changes: {                 // from the RecoveryOption.changes array
 *     nodeId: string,
 *     field: string,
 *     from: unknown,
 *     to: unknown,
 *   }[],
 *   newPhantomNode?: {         // only present when optionId === 'opt_phantom' or 'opt_partial_reroute'
 *     label: string,
 *     type: string,
 *     time: string,
 *     fromNodeId: string,
 *     toNodeId?: string,
 *   }
 * }
 *
 * Steps:
 *  1. Auth + validate
 *  2. Apply each change to the nodes collection
 *  3. If a newPhantomNode is present, insert it and wire the edge
 *  4. Mark the action as state: 'confirmed'
 *  5. POST to /api/trips/:id/graph (Person 3's graph-recompute) — fire-and-forget
 *  6. Publish realtime event + event log
 *
 * Response: { data: { applied: true, tripId, actionId, changesApplied: number } }
 */
export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json(
        { error: { code: 'AUTH_REQUIRED', message: 'Authentication required.' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { tripId, actionId, optionId, changes, newPhantomNode } = body as {
      tripId: string;
      actionId: string;
      optionId: string;
      changes: { nodeId: string; field: string; from: unknown; to: unknown }[];
      newPhantomNode?: {
        label: string;
        type: string;
        time: string;
        fromNodeId: string;
        toNodeId?: string;
      };
    };

    if (!tripId || !actionId || !optionId || !Array.isArray(changes)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'tripId, actionId, optionId, and changes[] are required.' } },
        { status: 422 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // Verify the trip exists
    const trip = await db.collection('trips').findOne(
      ObjectId.isValid(tripId) ? { _id: new ObjectId(tripId) } : { id: tripId }
    );
    if (!trip) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Trip not found.' } }, { status: 404 });
    }

    // Verify the action exists and is in a state that allows application
    let action: any = null;
    if (ObjectId.isValid(actionId)) {
      action = await db.collection('actions').findOne({ _id: new ObjectId(actionId) });
    }
    if (!action) {
      action = await db.collection('actions').findOne({ id: actionId });
    }
    if (!action) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Action not found.' } }, { status: 404 });
    }
    if (!['proposed', 'awaiting_payment', 'executing'].includes(action.state)) {
      return NextResponse.json(
        { error: { code: 'CONFLICT', message: `Action is in state '${action.state}' and cannot be applied.` } },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    let changesApplied = 0;

    // ── Step 2: Apply each change to the nodes collection ────────────────────
    for (const change of changes) {
      // Skip the synthetic 'phantom_new' placeholder — handled in step 3
      if (change.nodeId === 'phantom_new') continue;

      const nodeFilter = ObjectId.isValid(change.nodeId)
        ? { _id: new ObjectId(change.nodeId) }
        : { id: change.nodeId, tripId };

      const updateDoc: Record<string, any> = {
        [change.field]: change.to,
        updatedAt: now,
      };

      const result = await db.collection('nodes').updateOne(nodeFilter, { $set: updateDoc });
      if (result.matchedCount > 0) changesApplied++;
    }

    // ── Step 3: Insert phantom node if the plan adds one ─────────────────────
    let phantomNodeId: string | null = null;
    if (newPhantomNode) {
      const phantomDoc = {
        tripId,
        ownerId: user.id,
        type: newPhantomNode.type ?? 'phantom',
        label: newPhantomNode.label,
        time: newPhantomNode.time,
        constraintType: 'soft',
        status: 'pending_review',
        rawExtract: {},
        createdAt: now,
        updatedAt: now,
      };
      const insertResult = await db.collection('nodes').insertOne(phantomDoc);
      phantomNodeId = insertResult.insertedId.toString();

      // Wire a soft edge from the upstream node to the new phantom
      if (newPhantomNode.fromNodeId) {
        await db.collection('edges').insertOne({
          tripId,
          fromNodeId: newPhantomNode.fromNodeId,
          toNodeId: phantomNodeId,
          bufferMin: 15,
          paddingMin: 0,
          constraint: 'soft',
          shared: false,
          createdAt: now,
        });
      }
      changesApplied++;
    }

    // ── Step 4: Mark action as confirmed ─────────────────────────────────────
    const actionFilter = action._id ? { _id: action._id } : { id: actionId };
    await db.collection('actions').updateOne(actionFilter, {
      $set: {
        state: 'confirmed',
        confirmType: 'self_reported',
        confirmedAt: now,
        updatedAt: now,
        appliedOptionId: optionId,
        version: (action.version ?? 1) + 1,
      },
    });

    // ── Step 5: Trigger Person 3's graph-recompute (fire-and-forget) ──────────
    // This recalculates edge health scores and cascades after the node changes.
    // We do not await — a failure here must not roll back already-applied changes.
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
    fetch(`${baseUrl}/api/trips/${tripId}/graph`, {
      method: 'GET', // Person 3's graph endpoint reads and recomputes in-place
      headers: { 'Content-Type': 'application/json' },
    }).catch((err) => {
      console.warn('[apply-plan] Graph recompute request failed (non-fatal):', err);
    });

    // ── Step 6: Realtime + event log ──────────────────────────────────────────
    await Promise.all([
      publishTripEvent(tripId, { type: 'action.updated', entityId: actionId }),
      publishTripEvent(tripId, { type: 'trip.updated', entityId: tripId }),
      appendEventLog(db, {
        tripId,
        actor: user.id,
        type: 'itinerary.plan_applied',
        payload: {
          actionId,
          optionId,
          changesApplied,
          phantomNodeId,
        },
      }),
    ]);

    return NextResponse.json({
      data: {
        applied: true,
        tripId,
        actionId,
        optionId,
        changesApplied,
        phantomNodeId,
      },
    });
  } catch (error) {
    console.error('[apply-plan] Failed:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Failed to apply plan.' } },
      { status: 500 }
    );
  }
}
