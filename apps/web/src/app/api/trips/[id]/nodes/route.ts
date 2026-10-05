import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

// GET /api/trips/:id/nodes — list nodes for a trip (with optional ?status filter)
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: tripId } = await params;
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    const client = await clientPromise;
    const db = client.db();

    const query: Record<string, string> = { tripId };
    if (statusFilter) query.status = statusFilter;

    const nodes = await db.collection('nodes').find(query).sort({ time: 1 }).toArray();
    const mapped = nodes.map((n: any) => ({ id: n._id.toString(), ...n, _id: undefined }));

    return NextResponse.json({ data: { nodes: mapped } });
  } catch (err) {
    console.error('trips/[id]/nodes GET error', err);
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to fetch nodes' } }, { status: 500 });
  }
}
