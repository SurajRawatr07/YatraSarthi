import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getSessionUser } from '@/lib/auth';
import { getExtractor } from '@yatrasarthi/llm';

/**
 * POST /api/actions/:id/draft-vendor-email
 *
 * Generates (but does NOT persist) a vendor email draft using the LLM extractor.
 * Returns { data: { subject, body } }.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json(
        { error: { code: 'AUTH_REQUIRED', message: 'Authentication required.' } },
        { status: 401 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // Locate the action
    let action: any = null;
    if (ObjectId.isValid(id)) {
      action = await db.collection('actions').findOne({ _id: new ObjectId(id) });
    }
    if (!action) {
      action = await db.collection('actions').findOne({ id });
    }

    if (!action) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Action not found.' } },
        { status: 404 }
      );
    }

    // Fetch the trip
    const trip = await db.collection('trips').findOne({ _id: new ObjectId(action.tripId) }).catch(() => null)
      ?? await db.collection('trips').findOne({ id: action.tripId });

    // Fetch related booking node (first broken node in the trip)
    const node = await db.collection('nodes').findOne({ tripId: action.tripId, status: 'broken' })
      ?? await db.collection('nodes').findOne({ tripId: action.tripId });

    const booking = node ?? {
      type: 'hotel',
      label: trip?.name ?? 'Booking',
      vendor: 'Vendor',
    };

    const extractor = getExtractor();
    const draft = await extractor.draftVendorEmail({
      booking,
      policy: 'Standard cancellation policy',
      requestedChange: 'Rescheduling due to flight delay',
    });

    return NextResponse.json({ data: { subject: draft.subject, body: draft.body } });
  } catch (error) {
    console.error('[POST /api/actions/:id/draft-vendor-email]', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Failed to generate vendor email draft.' } },
      { status: 500 }
    );
  }
}
