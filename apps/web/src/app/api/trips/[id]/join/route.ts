import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getSessionUser } from '@/lib/auth';
import { Trip } from '@yatrasarthi/types';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { joinCode } = body;

    const sessionUser = await getSessionUser(request);
    const userId = sessionUser?.id || body.userId || 'guest_member';

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Trip not found' } },
        { status: 404 }
      );
    }

    const client = await clientPromise;
    const db = client.db();
    const tripId = new ObjectId(id);
    const trip = await db.collection('trips').findOne({ _id: tripId });

    if (!trip) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Trip not found' } },
        { status: 404 }
      );
    }

    // Join code check per contract: returns NOT_FOUND if code is wrong/doesn't match
    if (trip.joinCode && joinCode) {
      if (trip.joinCode.toUpperCase() !== joinCode.trim().toUpperCase()) {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Invalid join code for this trip' } },
          { status: 404 }
        );
      }
    }

    // Idempotent addition to memberIds
    await db.collection('trips').updateOne(
      { _id: tripId },
      {
        $addToSet: { memberIds: userId },
        $set: { updatedAt: new Date().toISOString() },
        $inc: { version: 1 },
      }
    );

    const updated = await db.collection('trips').findOne({ _id: tripId });

    const tripData: Trip = {
      id: updated!._id.toString(),
      name: updated!.name,
      destination: updated!.destination,
      startDate: updated!.startDate,
      endDate: updated!.endDate,
      ownerId: updated!.ownerId,
      memberIds: updated!.memberIds || [updated!.ownerId],
      joinCode: updated!.joinCode,
      status: updated!.status || 'healthy',
      healthScore: updated!.healthScore ?? 100,
      weakestEdge: updated!.weakestEdge,
      activeDisruptionId: updated!.activeDisruptionId,
      createdAt: updated!.createdAt,
      updatedAt: updated!.updatedAt,
      version: updated!.version || 1,
    };

    return NextResponse.json({ data: tripData });
  } catch (error: any) {
    console.error('Failed to join trip:', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Failed to join trip' } },
      { status: 500 }
    );
  }
}
