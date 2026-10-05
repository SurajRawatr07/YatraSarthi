import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getSessionUser } from '@/lib/auth';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id, userId } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Trip not found' } },
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

    // Owner check per contract
    if (sessionUser && trip.ownerId && trip.ownerId !== sessionUser.id && trip.ownerId !== 'demo') {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Only the trip owner can remove members' } },
        { status: 403 }
      );
    }

    // Cannot remove owner
    if (userId === trip.ownerId) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Cannot remove the owner of the trip' } },
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

    return NextResponse.json({ data: { removed: true } });
  } catch (error: any) {
    console.error('Failed to remove member:', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Failed to remove member' } },
      { status: 500 }
    );
  }
}
