import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getSessionUser } from '@/lib/auth';
import { Trip } from '@yatrasarthi/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Invalid trip ID' } },
        { status: 404 }
      );
    }

    const client = await clientPromise;
    const db = client.db();
    const trip = await db.collection('trips').findOne({ _id: new ObjectId(id) });

    if (!trip) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Trip not found' } },
        { status: 404 }
      );
    }

    const tripData: Trip = {
      id: trip._id.toString(),
      name: trip.name,
      destination: trip.destination,
      startDate: trip.startDate,
      endDate: trip.endDate,
      tripType: trip.tripType || (trip.memberIds?.length === 1 ? 'solo' : 'group'),
      ownerId: trip.ownerId,
      memberIds: trip.memberIds || [trip.ownerId],
      joinCode: trip.joinCode,
      status: trip.status || 'healthy',
      healthScore: trip.healthScore ?? 100,
      weakestEdge: trip.weakestEdge,
      activeDisruptionId: trip.activeDisruptionId,
      createdAt: trip.createdAt,
      updatedAt: trip.updatedAt,
      version: trip.version || 1,
    };

    return NextResponse.json({ data: tripData });
  } catch (error: any) {
    console.error('Error fetching trip by ID:', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Failed to fetch trip' } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Invalid trip ID' } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { baseVersion, name, startDate, endDate, tripType } = body;

    const client = await clientPromise;
    const db = client.db();
    const trip = await db.collection('trips').findOne({ _id: new ObjectId(id) });

    if (!trip) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Trip not found' } },
        { status: 404 }
      );
    }

    // Optimistic concurrency check per contract 0.6
    if (typeof baseVersion === 'number' && trip.version && trip.version !== baseVersion) {
      return NextResponse.json(
        {
          error: {
            code: 'CONFLICT',
            message: 'Trip changed, review before retrying.',
            details: {
              currentVersion: trip.version,
              current: { id: trip._id.toString(), ...trip },
            },
          },
        },
        { status: 409 }
      );
    }

    const updates: Record<string, any> = {
      updatedAt: new Date().toISOString(),
      version: (trip.version || 1) + 1,
    };
    if (name) updates.name = name;
    if (startDate) updates.startDate = startDate;
    if (endDate) updates.endDate = endDate;
    if (tripType === 'solo' || tripType === 'group') updates.tripType = tripType;

    await db.collection('trips').updateOne({ _id: new ObjectId(id) }, { $set: updates });

    const updatedTrip = await db.collection('trips').findOne({ _id: new ObjectId(id) });
    return NextResponse.json({
      data: {
        id: updatedTrip!._id.toString(),
        ...updatedTrip,
      },
    });
  } catch (error: any) {
    console.error('Error updating trip:', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Failed to update trip' } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Invalid trip ID' } },
        { status: 404 }
      );
    }

    const sessionUser = await getSessionUser(request);
    const client = await clientPromise;
    const db = client.db();
    const trip = await db.collection('trips').findOne({ _id: new ObjectId(id) });

    if (!trip) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Trip not found' } },
        { status: 404 }
      );
    }

    // Check ownership if user is logged in
    if (sessionUser && trip.ownerId && trip.ownerId !== sessionUser.id && trip.ownerId !== 'demo') {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Only the trip owner can delete this trip' } },
        { status: 403 }
      );
    }

    // Cascade deletions per contract 3
    const tripIdStr = id;
    await Promise.all([
      db.collection('trips').deleteOne({ _id: new ObjectId(id) }),
      db.collection('nodes').deleteMany({ tripId: tripIdStr }),
      db.collection('edges').deleteMany({ tripId: tripIdStr }),
      db.collection('actions').deleteMany({ tripId: tripIdStr }),
      db.collection('payments').deleteMany({ tripId: tripIdStr }),
      db.collection('events').deleteMany({ tripId: tripIdStr }),
    ]);

    return NextResponse.json({ data: { deleted: true } });
  } catch (error: any) {
    console.error('Error deleting trip:', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Failed to delete trip' } },
      { status: 500 }
    );
  }
}
