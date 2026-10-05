import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { TripGraph } from '@yatrasarthi/graph';
import { ObjectId } from 'mongodb';
import { publishTripEvent, appendEventLog } from '@/lib/realtime';
import { Node, Edge } from '@yatrasarthi/types';

/**
 * POST /api/disruptions/report
 *
 * Body: { nodeId: string; delayMinutes: number; source: DisruptionSource; cause?: CauseFlag; tripId?: string }
 *
 * 1. Marks the broken node as `broken` in the DB
 * 2. Runs TripGraph.propagateDelay() to find cascade effects
 * 3. Updates all impacted nodes
 * 4. Creates a disruption record + sets trip.activeDisruptionId
 * 5. Recomputes and persists trip.healthScore and trip.status (needs_attention | resolving)
 * 6. Returns the E2 Cascade Impact shape: disruptionId, brokenNode, effects[], affectedMemberIds
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Accept both delayMinutes (contract) and delayMin (legacy) so old clients still work
    const {
      nodeId,
      delayMinutes,
      delayMin,
      source = 'user_reported',
      cause,
    } = body as {
      nodeId: string;
      delayMinutes?: number;
      delayMin?: number;
      source?: string;
      cause?: string;
      tripId?: string;  // optional, derived from node if missing
    };

    const delay = delayMinutes ?? delayMin ?? 0;

    if (!nodeId || delay == null) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'nodeId and delayMinutes are required.' } },
        { status: 422 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // Resolve node — try ObjectId then string id field
    let brokenNode: any = null;
    if (ObjectId.isValid(nodeId)) {
      brokenNode = await db.collection('nodes').findOne({ _id: new ObjectId(nodeId) });
    }
    if (!brokenNode) {
      brokenNode = await db.collection('nodes').findOne({ id: nodeId });
    }
    if (!brokenNode) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Node not found.' } },
        { status: 404 }
      );
    }

    const tripId: string = body.tripId ?? brokenNode.tripId;
    const brokenNodeStringId: string = brokenNode.id ?? brokenNode._id.toString();

    // 1. Mark the broken node
    const brokenFilter = ObjectId.isValid(nodeId)
      ? { _id: new ObjectId(nodeId) }
      : { id: nodeId };
    await db.collection('nodes').updateOne(
      brokenFilter,
      { $set: { status: 'broken', delay, updatedAt: new Date().toISOString() } }
    );

    // 2. Fetch all nodes and edges for this trip
    const allNodes = await db.collection('nodes').find({ tripId }).toArray() as unknown as Node[];
    const allEdges = await db.collection('edges').find({ tripId }).toArray() as unknown as Edge[];

    // 3. Build graph and propagate
    const graph = new TripGraph();
    allNodes.forEach((n) => graph.addNode(n.id ?? (n as any)._id.toString()));
    allEdges.forEach((e) =>
      graph.addEdge({
        from: e.fromNodeId,
        to: e.toNodeId,
        bufferMin: e.bufferMin ?? 0,
        paddingMin: e.paddingMin ?? 0,
        constraint: e.constraint ?? 'soft',
      })
    );

    const { broken, atRisk } = graph.propagateDelay(brokenNodeStringId, delay);

    // 4. Persist cascade status changes
    if (broken.length > 0) {
      await db.collection('nodes').updateMany(
        { tripId, id: { $in: broken } },
        { $set: { status: 'broken', updatedAt: new Date().toISOString() } }
      );
    }
    if (atRisk.length > 0) {
      await db.collection('nodes').updateMany(
        { tripId, id: { $in: atRisk } },
        { $set: { status: 'at_risk', updatedAt: new Date().toISOString() } }
      );
    }

    // 5. Build the disruption record
    const disruptionDoc = {
      tripId,
      sourceNodeId: brokenNodeStringId,
      delayMinutes: delay,
      source,
      cause: cause ?? 'unknown',
      // triggerSource: maps source → canonical TriggerSource for DGCA engine
      triggerSource: body.triggerSource ?? (
        source === 'flight_provider' ? 'delay' :
        source === 'road_eta' && cause === 'extraordinary' ? 'weather' :
        cause === 'airline_controlled' ? 'vendor_cancellation' : 'delay'
      ),
      brokenNodes: [brokenNodeStringId, ...broken],
      atRiskNodes: atRisk,
      createdAt: new Date().toISOString(),
    };
    const disruption = await db.collection('disruptions').insertOne(disruptionDoc);
    const disruptionId = disruption.insertedId.toString();

    // 6. Compute new health score (100 - 20*broken - 10*at_risk, floor 0)
    const totalBroken = broken.length + 1; // +1 for the origin node
    const newHealthScore = Math.max(0, 100 - (totalBroken * 20) - (atRisk.length * 10));

    // Set trip status: 'needs_attention' (no action yet) — NOTE: transitions to 'resolving'
    // once an action is proposed (handled by /propose route).
    await db.collection('trips').updateOne(
      { _id: new ObjectId(tripId) },
      {
        $set: {
          healthScore: newHealthScore,
          status: 'needs_attention',   // Contract §0.5: one of healthy|needs_attention|resolving
          activeDisruptionId: disruptionId,
          updatedAt: new Date().toISOString(),
        },
      }
    );

    // 7. Build E2 Cascade Impact `effects[]` — one entry per impacted downstream node
    const nodeMap = new Map(
      allNodes.map((n) => [n.id ?? (n as any)._id.toString(), n])
    );
    const edgeMap = new Map(
      allEdges.map((e) => [e.fromNodeId + ':' + e.toNodeId, e])
    );

    const effects = [...broken, ...atRisk].map((nid) => {
      const node = nodeMap.get(nid) as any;
      const isHard = node?.constraintType === 'hard';
      // Rough cost estimate: hard constraints (missed connection etc.) at 0, soft at a cancellation fee
      const estimatedCost = isHard ? 0 : 150000; // ₹1500 in paise, rough placeholder
      return {
        nodeId: nid,
        label: node?.label ?? nid,
        consequence: isHard
          ? 'Hard constraint — cannot be delayed without rebooking'
          : 'Will be delayed or missed if no action is taken',
        estimatedCost,
        hard: isHard,
      };
    });

    // Collect affected member IDs from impacted nodes
    const affectedMemberIds = [
      ...new Set(
        [...broken, ...atRisk, brokenNodeStringId]
          .map((nid) => (nodeMap.get(nid) as any)?.ownerId)
          .filter(Boolean)
      ),
    ];

    // 8. Publish realtime events
    await Promise.all([
      publishTripEvent(tripId, { type: 'disruption.detected', entityId: disruptionId }),
      publishTripEvent(tripId, { type: 'trip.updated', entityId: tripId }),
      appendEventLog(db, {
        tripId,
        actor: 'system',
        type: 'disruption.detected',
        payload: {
          disruptionId,
          sourceNodeId: brokenNodeStringId,
          delayMinutes: delay,
          broken,
          atRisk,
        },
      }),
    ]);

    // 9. Return the E2 Cascade Impact shape
    return NextResponse.json({
      data: {
        disruptionId,
        brokenNode: {
          nodeId: brokenNodeStringId,
          label: (brokenNode as any).label ?? nodeId,
          delayMinutes: delay,
          source,
        },
        effects,
        affectedMemberIds,
        healthScore: newHealthScore,
      },
    });
  } catch (error) {
    console.error('[disruptions/report] Failed:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Failed to report disruption.' } },
      { status: 500 }
    );
  }
}
