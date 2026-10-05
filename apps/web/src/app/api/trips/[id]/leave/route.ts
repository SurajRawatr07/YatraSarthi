import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getSessionUser } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Trip not found' } },
        { status: 404 }
      );
    }

    const sessionUser = await getSessionUser(request);
    const body = await request.json().catch(() => ({}));
    const userId = sessionUser?.id || body.userId;

    if (!userId) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'User must be signed in to leave a trip' } },
        { status: 401 }
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

    // Owner cannot leave trip
    if (trip.ownerId === userId) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Trip owner cannot leave the trip. You can delete the trip instead.' } },
        { status: 403 }
      );
    }

    await db.collection('trips').updateOne(
      { _id: new ObjectId(id) },
      {
        $pull: { memberIds: userId } as any,
        $set: { updatedAt: new Date().toISOString() },
        $inc: { version: 1 },
      }
    );

    return NextResponse.json({ data: { left: true } });
  } catch (error: any) {
    console.error('Failed to leave trip:', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Failed to leave trip' } },
      { status: 500 }
    );
  }
}
