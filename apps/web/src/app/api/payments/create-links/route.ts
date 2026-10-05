import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getSessionUser } from '@/lib/auth';
import { publishTripEvent, appendEventLog } from '@/lib/realtime';

/**
 * POST /api/payments/create-links
 * Body: { tripId, actionId, payers: [{ memberId, amount }] }
 *
 * Creates one mock payment record per payer. No real payment gateway is used.
 * Payment URLs are simulated as internal links so the demo flow works end-to-end.
 * Each record gets a unique id, deadlineAt (24h), and 'pending' status.
 *
 * Broadcasts a payment.updated event and writes to the event log.
 */
export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json(
        { error: { code: 'AUTH_REQUIRED', message: 'Authentication required.' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { tripId, actionId, payers } = body as {
      tripId: string;
      actionId: string;
      payers: { memberId: string; amount: number }[];
    };

    if (!tripId || !actionId || !Array.isArray(payers) || payers.length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'tripId, actionId, and payers[] are required.' } },
        { status: 422 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    const now = new Date();
    const deadlineAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); // 24h from now

    // Build one payment record per payer — no real gateway, just a mock reference
    const paymentDocs = payers.map((payer) => {
      const mockRef = `demo_${Math.random().toString(36).substring(2, 11)}`;
      return {
        tripId,
        actionId,
        memberId: payer.memberId,
        amount: payer.amount,
        status: 'pending',
        // Demo payment URL — points to the in-app payment status screen, not a real gateway
        paymentLinkUrl: `/pay/${mockRef}?tripId=${tripId}&actionId=${actionId}`,
        aggregatorRef: mockRef,
        deadlineAt,
        createdAt: now.toISOString(),
        paidAt: null,
      };
    });

    const result = await db.collection('payments').insertMany(paymentDocs);
    const insertedIds = (Object.values(result.insertedIds) as any[]).map(id => id.toString());

    const links = paymentDocs.map((doc, i) => ({
      id: insertedIds[i],
      ...doc,
    }));

    // Publish realtime event
    await Promise.all([
      publishTripEvent(tripId, { type: 'payment.updated', entityId: actionId }),
      appendEventLog(db, {
        tripId,
        actor: user.id,
        type: 'payment.links_created',
        payload: { actionId, payerCount: payers.length },
      }),
    ]);

    return NextResponse.json({ data: { links } }, { status: 201 });
  } catch (error) {
    console.error('[create-links] Failed to create payment links:', error);
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to create payment links.' } }, { status: 500 });
  }
}
