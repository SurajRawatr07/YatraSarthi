import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { TripGraph } from '@yatrasarthi/graph';
import { publishTripEvent } from '@/lib/realtime';

/**
 * GET /api/trips/:id/graph
 * Returns nodes, edges, trip health score and cascade-computed statuses.
 * Runs TripGraph to recompute which nodes are broken/at_risk based on current edge buffers,
 * then persists any status changes back to the DB before responding.
 * Also handles cancelled nodes — forces all downstream to hard-broken via propagateCancellation().
 *
 * POST /api/trips/:id/graph
 * Explicit graph-recompute trigger called by Person 4's apply-plan endpoint.
 * Same logic as GET but also broadcasts trip.updated event. Returns { ok: true }.
 */

async function recomputeGraph(id: string) {
  const client = await clientPromise;
  const db = client.db();

  const [trip, nodes, edges] = await Promise.all([
    db.collection('trips').findOne(
      ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id }
    ),
    db.collection('nodes').find({ tripId: id }).sort({ time: 1 }).toArray(),
    db.collection('edges').find({ tripId: id }).toArray(),
  ]);

  if (!trip) return null;

  // Normalise IDs
  const mappedNodes = nodes.map((n: any) => ({ ...n, id: n.id ?? n._id.toString(), _id: undefined }));
  const mappedEdges = edges.map((e: any) => ({ ...e, id: e.id ?? e._id.toString(), _id: undefined }));

  // Build graph
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

  // Find cancelled nodes first — their downstream are hard-broken regardless of buffer
  const cancelledNodes = mappedNodes.filter((n: any) => n.status === 'cancelled');
  const hardBrokenFromCancelled = new Set<string>();
  for (const cn of cancelledNodes) {
    const { broken } = graph.propagateCancellation(cn.id);
    broken.forEach((nid) => hardBrokenFromCancelled.add(nid));
  }

  // Find any currently-broken nodes and propagate delay cascade
  const brokenNodes = mappedNodes.filter((n: any) => n.status === 'broken');
  const allBroken = new Set<string>([
    ...brokenNodes.map((n: any) => n.id),
    ...hardBrokenFromCancelled,
  ]);
  const allAtRisk = new Set<string>();

  for (const bn of brokenNodes) {
    const { broken, atRisk } = graph.propagateDelay(bn.id, bn.delay ?? 60);
    broken.forEach((nid) => allBroken.add(nid));
    atRisk.forEach((nid) => allAtRisk.add(nid));
  }

  // broken wins over at_risk
  allAtRisk.forEach((nid) => { if (allBroken.has(nid)) allAtRisk.delete(nid); });
  // cancelled nodes not in broken/atRisk (they have their own status)
  cancelledNodes.forEach((cn: any) => { allBroken.delete(cn.id); allAtRisk.delete(cn.id); });

  // Merge results
  const finalNodes = mappedNodes.map((n: any) => {
    if (n.status === 'cancelled') return n;
    if (allBroken.has(n.id)) return { ...n, status: 'broken' };
    if (allAtRisk.has(n.id)) return { ...n, status: 'at_risk' };
    return n;
  });

  const newHealthScore = Math.max(0, 100 - (allBroken.size * 20) - (allAtRisk.size * 10));
  const newTripStatus = allBroken.size > 0
    ? 'needs_attention'
    : allAtRisk.size > 0 ? 'needs_attention' : 'healthy';

  // Persist status changes
  const dbUpdates: Promise<any>[] = [];
  if (allBroken.size > 0) {
    dbUpdates.push(
      db.collection('nodes').updateMany(
        { tripId: id, id: { $in: [...allBroken] } },
        { $set: { status: 'broken', updatedAt: new Date().toISOString() } }
      )
    );
  }
  if (allAtRisk.size > 0) {
    dbUpdates.push(
      db.collection('nodes').updateMany(
        { tripId: id, id: { $in: [...allAtRisk] } },
        { $set: { status: 'at_risk', updatedAt: new Date().toISOString() } }
      )
    );
  }
  dbUpdates.push(
    db.collection('trips').updateOne(
      ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id },
      { $set: { healthScore: newHealthScore, status: newTripStatus, updatedAt: new Date().toISOString() } }
    )
  );
  await Promise.all(dbUpdates);

  return { db, newHealthScore, newTripStatus, finalNodes, mappedEdges, tripId: id };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await recomputeGraph(id);

    if (!result) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    const { newHealthScore, newTripStatus, finalNodes, mappedEdges } = result;
    return NextResponse.json({
      healthScore: newHealthScore,
      status: newTripStatus,
      nodes: finalNodes,
      edges: mappedEdges,
    });
  } catch (error) {
    console.error('[graph GET] Failed:', error);
    return NextResponse.json({ error: 'Failed to fetch graph' }, { status: 500 });
  }
}

/** POST /api/trips/:id/graph — explicit recompute trigger called after apply-plan */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await recomputeGraph(id);

    if (!result) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    const { newHealthScore, newTripStatus } = result;

    // Broadcast so all clients update
    await publishTripEvent(id, { type: 'trip.updated', entityId: id });

    return NextResponse.json({ ok: true, healthScore: newHealthScore, status: newTripStatus });
  } catch (error) {
    console.error('[graph POST] Failed:', error);
    return NextResponse.json({ error: 'Failed to recompute graph' }, { status: 500 });
  }
}
