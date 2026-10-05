import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getSessionUser } from '@/lib/auth';
import { generateRecoveryOptions } from '@/lib/recoveryRanker';
import { TriggerSource, RankingMode } from '@yatrasarthi/types';

/**
 * POST /api/trips/:id/request-alternatives
 *
 * Tool endpoint called by Person 1's AI chat orchestration layer when the user
 * asks "what are my options?" via the chat panel.
 *
 * This is the `requestAlternatives` tool in the five fixed chat tools.
 *
 * Body: {
 *   disruptionId?: string,       // if the user is asking about a specific disruption
 *   mode?: RankingMode,          // cheapest | fastest | preserve_itinerary (default: cheapest)
 *   sortBy?: 'cost' | 'time' | 'bookings',
 * }
 *
 * Returns the same shape as GET /api/trips/:id/recovery-options so the chat layer
 * can format and stream the options back to the user, ready for a confirm tap.
 *
 * Response: {
 *   data: {
 *     options: ExtendedRecoveryOption[],
 *     triggerSource: TriggerSource | null,
 *     dgcaEligible: boolean,
 *     summary: string,           // one-line human-readable summary for the chat response
 *   }
 * }
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

    const body = await request.json().catch(() => ({}));
    const {
      disruptionId,
      mode: rawMode,
      sortBy,
    } = body as {
      disruptionId?: string;
      mode?: string;
      sortBy?: 'cost' | 'time' | 'bookings';
    };

    const mode: RankingMode = ['cheapest', 'fastest', 'preserve_itinerary'].includes(rawMode ?? '')
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

    // Resolve broken node + triggerSource — same logic as GET recovery-options
    let brokenNodeId: string | null = null;
    let triggerSource: TriggerSource | undefined;

    if (disruptionId) {
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
      const firstBroken = (nodes as any[]).find((n) => n.status === 'broken');
      brokenNodeId = firstBroken?.id ?? firstBroken?._id?.toString() ?? null;
      if (!triggerSource && firstBroken?.triggerSource) {
        triggerSource = firstBroken.triggerSource;
      }
    }

    if (!brokenNodeId) {
      return NextResponse.json({
        data: {
          options: [],
          triggerSource: null,
          dgcaEligible: false,
          summary: 'No active disruption found for this trip. Everything looks on track!',
        },
      });
    }

    // Normalise IDs
    const mappedNodes = (nodes as any[]).map((n) => ({ ...n, id: n.id ?? n._id?.toString() }));
    const mappedEdges = (edges as any[]).map((e) => ({ ...e, id: e.id ?? e._id?.toString() }));

    let options = generateRecoveryOptions(id, mappedNodes, mappedEdges, brokenNodeId, mode, triggerSource);

    // Apply requested sort
    if (sortBy === 'cost') {
      options = [...options].sort((a, b) => a.sortKey.cost - b.sortKey.cost);
    } else if (sortBy === 'time') {
      options = [...options].sort((a, b) => a.sortKey.timePenaltyMin - b.sortKey.timePenaltyMin);
    } else if (sortBy === 'bookings') {
      options = [...options].sort((a, b) => b.sortKey.bookingsPreserved - a.sortKey.bookingsPreserved);
    }

    const dgcaEligible = options.some((o) => o.dgca?.eligible);
    const recommended = options.find((o) => o.recommended);

    // Build a one-line summary the chat layer can stream as the assistant reply
    const dgcaNote = dgcaEligible
      ? ` You may also be eligible for DGCA compensation of ₹${((recommended?.dgca?.amountPaise ?? 0) / 100).toLocaleString('en-IN')}.`
      : triggerSource === 'weather'
      ? ' Note: weather disruptions are extraordinary circumstances — DGCA compensation does not apply.'
      : '';

    const summary = recommended
      ? `I found ${options.length} recovery option${options.length > 1 ? 's' : ''} for your trip. ` +
        `My top recommendation is "${recommended.name}" ` +
        `(₹${(recommended.netCost / 100).toLocaleString('en-IN')} net cost, arrives ~${recommended.arrivalTime}).` +
        dgcaNote +
        ' Tap any option below to review and confirm before anything changes.'
      : 'I found some recovery options for you. Review them below and tap to confirm before any changes are made.';

    return NextResponse.json({
      data: { options, triggerSource: triggerSource ?? null, dgcaEligible, summary },
    });
  } catch (error) {
    console.error('[request-alternatives] Failed:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Failed to generate alternatives.' } },
      { status: 500 }
    );
  }
}
