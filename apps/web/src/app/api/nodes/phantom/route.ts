import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getSessionUser } from '@/lib/auth';

// POST /api/nodes/phantom — add an unbooked leg (auto, walk, local train, etc.)
// Skips pending_review — the user typed it directly, so it goes straight to on_track.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tripId, mode, fromLabel, toLabel, paddingMin, departsByNodeId } = body;

    if (!tripId || !mode || !fromLabel || !toLabel) {
      return NextResponse.json({
        error: { code: 'VALIDATION_ERROR', message: 'tripId, mode, fromLabel, toLabel are required' },
      }, { status: 422 });
    }

    // Call routing provider for estimated travel time
    let estimatedMin = 30; // fallback
    let routingProvider = 'fallback';
    try {
      const routeRes = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/routing/estimate?from=${encodeURIComponent(fromLabel)}&to=${encodeURIComponent(toLabel)}`
      );
      if (routeRes.ok) {
        const routeData = await routeRes.json();
        estimatedMin = routeData.data?.estimatedMin ?? estimatedMin;
        routingProvider = routeData.data?.provider ?? routingProvider;
      }
    } catch {
      // routing failure is non-fatal; use fallback value
    }

    const sessionUser = await getSessionUser(request);
    const client = await clientPromise;
    const db = client.db();
    const now = new Date().toISOString();

    const doc = {
      tripId,
      ownerId: sessionUser?.id ?? 'anonymous',
      type: 'phantom' as const,
      phantomMode: mode,
      label: `${mode}: ${fromLabel} to ${toLabel}`,
      time: now,
      constraintType: 'soft' as const,
      status: 'on_track' as const,
      rawExtract: {},
      routing: { fromLabel, toLabel, estimatedMin, paddingMin: paddingMin ?? 0, provider: routingProvider },
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection('nodes').insertOne(doc);

    // Link phantom node after the departsByNode in the graph
    if (departsByNodeId) {
      await db.collection('edges').insertOne({
        tripId,
        fromNodeId: departsByNodeId,
        toNodeId: result.insertedId.toString(),
        bufferMin: paddingMin ?? 0,
        paddingMin: paddingMin ?? 0,
        constraint: 'soft',
        shared: false,
      });
    }

    return NextResponse.json({ data: { id: result.insertedId.toString(), ...doc } }, { status: 201 });
  } catch (err) {
    console.error('nodes/phantom error', err);
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to add phantom node' } }, { status: 500 });
  }
}
