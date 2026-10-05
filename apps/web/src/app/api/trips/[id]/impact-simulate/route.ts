import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { TripGraph } from '@yatrasarthi/graph';

/**
 * POST /api/trips/:id/impact-simulate
 *
 * Dry-run impact simulator — the "What if…?" engine.
 * Runs `TripGraph.simulateImpact()` on the live trip graph without writing anything to the DB.
 * Used by:
 *   - The "What if?" node action (D2 screen)
 *   - The cascade impact panel (E2) for multi-hop chain visualisation
 *   - Person 4's ranker (future) to pre-score options before proposing
 *
 * Body: {
 *   nodeId: string,        // the node to simulate as broken/cancelled
 *   delayMinutes: number,  // simulated delay (0 if cancelled=true means complete outage)
 *   cancelled?: boolean,   // if true, treats node as cancelled (hard-breaks ALL downstream)
 * }
 *
 * Response: {
 *   data: {
 *     brokenNode: { nodeId, label, delayMinutes, cancelled },
 *     broken: string[],      // cascade hard-broken node IDs
 *     atRisk: string[],      // cascade at-risk node IDs
 *     hopChain: {            // ordered multi-hop chain for E2 visualisation
 *       nodeId: string,
 *       label: string,
 *       delayMin: number,
 *       constraint: string,
 *       reason: string,
 *       estimatedCost: number,
 *     }[],
 *     simulatedHealthScore: number,
 *     totalEstimatedCost: number,  // paise
 *   }
 * }
 *
 * This is a READ-ONLY endpoint — no DB writes. Safe to call repeatedly.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      nodeId,
      delayMinutes,
      cancelled = false,
    } = body as {
      nodeId: string;
      delayMinutes: number;
      cancelled?: boolean;
    };

    if (!nodeId || delayMinutes == null) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'nodeId and delayMinutes are required.' } },
        { status: 422 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    const [trip, nodes, edges] = await Promise.all([
      db.collection('trips').findOne(
        ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id }
      ),
      db.collection('nodes').find({ tripId: id }).sort({ time: 1 }).toArray(),
      db.collection('edges').find({ tripId: id }).toArray(),
    ]);

    if (!trip) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Trip not found.' } }, { status: 404 });
    }

    // Resolve the target node — try ObjectId, then id field, then string id
    let targetNode: any = nodes.find(
      (n: any) => (n.id ?? n._id?.toString()) === nodeId || n._id?.toString() === nodeId
    );
    if (!targetNode && ObjectId.isValid(nodeId)) {
      targetNode = nodes.find((n: any) => n._id?.toString() === nodeId);
    }
    if (!targetNode) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Node not found in trip.' } }, { status: 404 });
    }

    // Normalise IDs
    const mappedNodes = nodes.map((n: any) => ({ ...n, id: n.id ?? n._id?.toString() }));
    const mappedEdges = edges.map((e: any) => ({ ...e, id: e.id ?? e._id?.toString() }));
    const targetId = targetNode.id ?? targetNode._id?.toString();

    // Build graph — no DB writes
    const graph = new TripGraph();
    mappedNodes.forEach((n: any) => graph.addNode(n.id));
    mappedEdges.forEach((e: any) =>
      graph.addEdge({
        from: e.fromNodeId,
        to: e.toNodeId,
        bufferMin: e.bufferMin ?? 0,
        paddingMin: e.paddingMin ?? 0,
        constraint: e.constraint ?? 'soft',
      })
    );

    const { broken, atRisk, delay, hopChain } = graph.simulateImpact(
      targetId,
      cancelled ? (delayMinutes || 999) : delayMinutes,
      cancelled
    );

    // Build a rich node map for labels + cost estimates
    const nodeMap = new Map(mappedNodes.map((n: any) => [n.id, n]));

    const COST_BY_TYPE: Record<string, number> = {
      flight: 650000,
      train: 120000,
      hotel: 300000,
      cab: 80000,
      bus: 50000,
      phantom: 150000,
    };

    const enrichedHopChain = hopChain.map((hop) => {
      const n = nodeMap.get(hop.nodeId) as any;
      const estimatedCost = n?.constraintType === 'hard' ? 0 : (COST_BY_TYPE[n?.type] ?? 100000);
      return {
        ...hop,
        label: n?.label ?? hop.nodeId,
        type: n?.type ?? 'unknown',
        estimatedCost,
      };
    });

    const totalEstimatedCost = enrichedHopChain.reduce((s, h) => s + h.estimatedCost, 0);

    // Simulated health score (not persisted)
    const simulatedHealthScore = Math.max(
      0,
      100 - ((broken.length + (cancelled ? 1 : 0)) * 20) - (atRisk.length * 10)
    );

    return NextResponse.json({
      data: {
        brokenNode: {
          nodeId: targetId,
          label: targetNode.label ?? nodeId,
          delayMinutes: cancelled ? null : delayMinutes,
          cancelled,
        },
        broken,
        atRisk,
        hopChain: enrichedHopChain,
        simulatedHealthScore,
        totalEstimatedCost,
      },
    });
  } catch (error) {
    console.error('[impact-simulate] Failed:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Failed to run impact simulation.' } },
      { status: 500 }
    );
  }
}
