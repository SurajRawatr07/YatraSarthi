import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { generateRecoveryOptions } from '@/lib/recoveryRanker';
import { TriggerSource, RankingMode } from '@yatrasarthi/types';

/**
 * GET /api/trips/:id/recovery-options
 * Query: ?disruptionId=&mode=cheapest|fastest|preserve_itinerary&sortBy=cost|time|bookings
 *
 * Finds all broken nodes for the trip (or the specific disruption),
 * runs the extended recovery ranker (4 labelled, de-duplicated plans, DGCA-aware),
 * and returns options in the contract-specified envelope.
 *
 * Response: { data: { options: ExtendedRecoveryOption[], triggerSource, dgcaEligible } }
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const disruptionId = searchParams.get('disruptionId');
    const overrideBrokenNodeId = searchParams.get('brokenNodeId');
    const rawMode = searchParams.get('mode') ?? 'cheapest';
    const sortBy = searchParams.get('sortBy') as 'cost' | 'time' | 'bookings' | null;

    const mode: RankingMode = ['cheapest', 'fastest', 'preserve_itinerary'].includes(rawMode)
      ? (rawMode as RankingMode)
      : 'cheapest';

    const client = await clientPromise;
    const db = client.db();

    const [nodes, edges, trip] = await Promise.all([
      db.collection('nodes').find({ tripId: id }).sort({ time: 1 }).toArray(),
      db.collection('edges').find({ tripId: id }).toArray(),
      db.collection('trips').findOne(
        ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id }
      ),
    ]);

    if (!trip) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Trip not found.' } },
        { status: 404 }
      );
    }

    // Determine which broken node to base recovery options on:
    // 1. If a disruptionId is provided, look up that specific disruption
    // 2. Otherwise fall back to the trip's activeDisruptionId
    // 3. Otherwise pick the first broken node
    let brokenNodeId: string | null = overrideBrokenNodeId ?? null;
    let triggerSource: TriggerSource | undefined;

    if (!brokenNodeId && disruptionId) {
      const disruption = await db.collection('disruptions').findOne(
        ObjectId.isValid(disruptionId) ? { _id: new ObjectId(disruptionId) } : { id: disruptionId }
      );
      brokenNodeId = disruption?.sourceNodeId ?? null;
      triggerSource = disruption?.triggerSource;
    }

    if (!brokenNodeId && trip.activeDisruptionId) {
      const activeDis = await db.collection('disruptions').findOne(
        ObjectId.isValid(trip.activeDisruptionId)
          ? { _id: new ObjectId(trip.activeDisruptionId) }
          : { id: trip.activeDisruptionId }
      );
      brokenNodeId = activeDis?.sourceNodeId ?? null;
      triggerSource = activeDis?.triggerSource;
    }

    if (!brokenNodeId) {
      // Fallback: first broken node in the trip
      const firstBroken = (nodes as any[]).find((n) => n.status === 'broken');
      brokenNodeId = firstBroken?.id ?? firstBroken?._id?.toString() ?? null;
      // If the node itself carries a triggerSource, pick it up
      if (!triggerSource && firstBroken?.triggerSource) {
        triggerSource = firstBroken.triggerSource;
      }
    }

    if (!brokenNodeId) {
      return NextResponse.json({ data: { options: [], triggerSource: null, dgcaEligible: false } });
    }

    // Normalise IDs
    const mappedNodes = (nodes as any[]).map((n) => ({ ...n, id: n.id ?? n._id?.toString() }));
    const mappedEdges = (edges as any[]).map((e) => ({ ...e, id: e.id ?? e._id?.toString() }));

    let options = generateRecoveryOptions(id, mappedNodes, mappedEdges, brokenNodeId, mode, triggerSource);

    // Client-requested sort override (frontend E3 sortable list)
    if (sortBy === 'cost') {
      options = [...options].sort((a, b) => a.sortKey.cost - b.sortKey.cost);
    } else if (sortBy === 'time') {
      options = [...options].sort((a, b) => a.sortKey.timePenaltyMin - b.sortKey.timePenaltyMin);
    } else if (sortBy === 'bookings') {
      options = [...options].sort((a, b) => b.sortKey.bookingsPreserved - a.sortKey.bookingsPreserved);
    }

    const dgcaEligible = options.some((o) => o.dgca?.eligible);

    return NextResponse.json({ data: { options, triggerSource: triggerSource ?? null, dgcaEligible } });
  } catch (error) {
    console.error('[recovery-options] Failed:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Failed to get recovery options.' } },
      { status: 500 }
    );
  }
}
