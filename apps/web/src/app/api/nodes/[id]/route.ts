import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// GET /api/nodes/:id — booking detail with prev/next neighbour info (C6)
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db();

    const node = await db.collection('nodes').findOne({ _id: new ObjectId(id) });
    if (!node) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Node not found' } }, { status: 404 });

    // Compute prev/next from edges
    const edges = await db.collection('edges').find({ tripId: node.tripId }).toArray();
    const inEdge = edges.find((e: any) => e.toNodeId === id);
    const outEdge = edges.find((e: any) => e.fromNodeId === id);

    return NextResponse.json({
      data: {
        id: node._id.toString(),
        ...node,
        _id: undefined,
        prevNodeId: inEdge?.fromNodeId,
        nextNodeId: outEdge?.toNodeId,
        bufferToPrevMin: inEdge?.bufferMin,
        bufferToNextMin: outEdge?.bufferMin,
      },
    });
  } catch (err) {
    console.error('nodes/[id] GET error', err);
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to fetch node' } }, { status: 500 });
  }
}

// PATCH /api/nodes/:id — edit fields or paddingMin (C6 edit, C5 buffer adjustment)
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const client = await clientPromise;
    const db = client.db();

    const update: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (body.fields) update['rawExtract'] = body.fields;
    if (body.paddingMin !== undefined) {
      update['routing.paddingMin'] = body.paddingMin;
      // Also update the adjoining edge's paddingMin
      await db.collection('edges').updateOne({ fromNodeId: id }, { $set: { paddingMin: body.paddingMin } });
    }

    await db.collection('nodes').updateOne(
      { _id: new ObjectId(id) },
      { $set: update },
    );
    const result = await db.collection('nodes').findOne({ _id: new ObjectId(id) });
    if (!result) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Node not found' } }, { status: 404 });

    return NextResponse.json({ data: { id: result._id.toString(), ...result, _id: undefined } });
  } catch (err) {
    console.error('nodes/[id] PATCH error', err);
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to update node' } }, { status: 500 });
  }
}

// DELETE /api/nodes/:id — remove node and its edges (C6 "Remove from trip")
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db();

    const node = await db.collection('nodes').findOne({ _id: new ObjectId(id) });
    if (!node) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Node not found' } }, { status: 404 });

    await db.collection('nodes').deleteOne({ _id: new ObjectId(id) });
    await db.collection('edges').deleteMany({ $or: [{ fromNodeId: id }, { toNodeId: id }] });

    return NextResponse.json({ data: { removed: true } });
  } catch (err) {
    console.error('nodes/[id] DELETE error', err);
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to delete node' } }, { status: 500 });
  }
}
