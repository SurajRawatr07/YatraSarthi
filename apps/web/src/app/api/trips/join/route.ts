import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getSessionUser } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { joinCode } = body;

    if (!joinCode || typeof joinCode !== 'string') {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Join code is required' } },
        { status: 400 }
      );
    }

    const sessionUser = await getSessionUser(request);
    const userId = sessionUser?.id || body.userId;

    if (!userId) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'You must be signed in to join a trip' } },
        { status: 401 }
      );
    }

    const client = await clientPromise;
    const db = client.db();
    const cleanCode = joinCode.trim().toUpperCase();

    const trip = await db.collection('trips').findOne({ joinCode: cleanCode });
    if (!trip) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'No trip found with that join code' } },
        { status: 404 }
      );
    }

    // Add user to memberIds
    await db.collection('trips').updateOne(
      { _id: trip._id },
      {
        $addToSet: { memberIds: userId },
        $set: { updatedAt: new Date().toISOString() },
        $inc: { version: 1 },
      }
    );

    const updatedTrip = await db.collection('trips').findOne({ _id: trip._id });

    return NextResponse.json({
      data: {
        id: updatedTrip!._id.toString(),
        ...updatedTrip,
      },
    });
  } catch (error: any) {
    console.error('Failed to join trip by code:', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Failed to join trip' } },
      { status: 500 }
    );
  }
}
