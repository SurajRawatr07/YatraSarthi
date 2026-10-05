import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { Trip } from '@yatrasarthi/types';
import { ObjectId } from 'mongodb';
import { getSessionUser } from '@/lib/auth';

/**
 * Generate a human-readable joinCode: word + 3 digits, e.g. GOA123
 */
function generateJoinCode(destination?: string): string {
  const cleanDest = (destination || 'TRIP')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 4);
  const prefix = cleanDest.length >= 3 ? cleanDest : 'TRIP';
  const num = Math.floor(100 + Math.random() * 900);
  return `${prefix}${num}`;
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser(request);
    const body = await request.json();
    const client = await clientPromise;
    const db = client.db();

    const ownerId = sessionUser?.id || body.userId || 'demo';
    let joinCode = generateJoinCode(body.destination);

    // Collision check joinCode
    let existing = await db.collection('trips').findOne({ joinCode });
    let attempts = 0;
    while (existing && attempts < 5) {
      joinCode = generateJoinCode(body.destination);
      existing = await db.collection('trips').findOne({ joinCode });
      attempts++;
    }

    const newTrip: Omit<Trip, 'id'> & { _id?: ObjectId } = {
      name: body.name || 'New Trip',
      destination: body.destination || 'Unknown',
      startDate: body.startDate || new Date().toISOString().split('T')[0],
      endDate: body.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      tripType: body.tripType === 'solo' ? 'solo' : 'group',
      ownerId,
      memberIds: [ownerId],
      joinCode,
      healthScore: 100,
      status: 'healthy',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };

    const result = await db.collection('trips').insertOne(newTrip);
    const createdTrip: Trip = {
      id: result.insertedId.toString(),
      ...newTrip,
    };

    return NextResponse.json({ data: createdTrip }, { status: 201 });
  } catch (error) {
    console.error('Failed to create trip', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Failed to create trip' } },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusQuery = searchParams.get('status'); // 'active' | 'completed'
    const sessionUser = await getSessionUser(request);

    const client = await clientPromise;
    const db = client.db();

    // Query trips
    const query: Record<string, any> = {};
    const today = new Date().toISOString().split('T')[0];

    if (statusQuery === 'active') {
      query.endDate = { $gte: today };
    } else if (statusQuery === 'completed') {
      query.endDate = { $lt: today };
    }

    // Sort order per spec: startDate ascending for active, descending for completed
    const sortOrder = statusQuery === 'completed' ? -1 : 1;

    const trips = await db
      .collection('trips')
      .find(query)
      .sort({ startDate: sortOrder })
      .toArray();

    // Fetch nodes and travellers for each trip to keep TripData happy
    const mappedTrips = await Promise.all(
      trips.map(async (t: any) => {
        const tripIdStr = t._id.toString();
        const [nodes, edges] = await Promise.all([
          db.collection('nodes').find({ tripId: tripIdStr }).sort({ time: 1 }).toArray(),
          db.collection('edges').find({ tripId: tripIdStr }).toArray(),
        ]);

        // Get members info
        const memberIds: string[] = t.memberIds || [t.ownerId];
        const users = await db
          .collection('users')
          .find({
            $or: [
              { _id: { $in: memberIds.filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id)) } },
              { id: { $in: memberIds } }
            ]
          })
          .toArray();

        const travellers = users.map((u: any) => ({
          id: u._id.toString(),
          name: u.name || 'Traveler',
          phone: u.phone,
          avatar: u.name ? u.name[0].toUpperCase() : '👤',
          paymentStatus: 'paid' as const,
          tripStatus: 'confirmed' as const,
        }));

        if (travellers.length === 0) {
          travellers.push({
            id: t.ownerId,
            name: sessionUser?.name || 'Owner',
            phone: sessionUser?.phone || '+91 98765 43210',
            avatar: '👤',
            paymentStatus: 'paid',
            tripStatus: 'confirmed',
          });
        }

        return {
          id: tripIdStr,
          name: t.name,
          destination: t.destination,
          startDate: t.startDate,
          endDate: t.endDate,
          tripType: t.tripType || (t.memberIds?.length === 1 ? 'solo' : 'group'),
          ownerId: t.ownerId,
          memberIds: t.memberIds || [t.ownerId],
          joinCode: t.joinCode,
          status: t.status || 'healthy',
          healthScore: t.healthScore ?? 100,
          health: t.healthScore ?? 100,
          weakestEdge: t.weakestEdge,
          activeDisruptionId: t.activeDisruptionId,
          createdAt: t.createdAt || new Date().toISOString(),
          updatedAt: t.updatedAt || new Date().toISOString(),
          version: t.version || 1,
          nodes: nodes.map((n: any) => ({ ...n, id: n._id.toString() })),
          edges: edges.map((e: any) => ({ ...e, id: e._id?.toString(), fromNodeId: e.fromNodeId, toNodeId: e.toNodeId, bufferMin: e.bufferMin ?? 60, paddingMin: e.paddingMin ?? 0, constraint: e.constraint ?? 'soft' })),
          travellers,
          actions: [],
          eventLog: [],
        };
      })
    );

    return NextResponse.json({ data: { trips: mappedTrips } });
  } catch (error) {
    console.error('Failed to fetch trips:', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Failed to fetch trips' } },
      { status: 500 }
    );
  }
}
