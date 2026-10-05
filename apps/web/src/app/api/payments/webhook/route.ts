import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { publishTripEvent } from '@/lib/realtime';

/**
 * POST /api/payments/webhook  (MOCK — no real aggregator signature check)
 *
 * Accepts: { paymentId: string; status: 'paid' | 'failed' }
 * Finds the matching payment, flips its status.
 * If every payment for that actionId is now 'paid', transitions the action → 'executing'.
 *
 * Always returns 200 { ok: true } so the (mock) aggregator doesn't retry.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { paymentId, status } = body as { paymentId: string; status: 'paid' | 'failed' };

    if (!paymentId || !['paid', 'failed'].includes(status)) {
      // Per contract: always 200 to aggregator; log, don't surface
      console.warn('[webhook] Invalid mock payload:', body);
      return NextResponse.json({ ok: true });
    }

    const client = await clientPromise;
    const db = client.db();

    // Locate the payment — try ObjectId then string id
    let payment: any = null;
    if (ObjectId.isValid(paymentId)) {
      payment = await db.collection('payments').findOne({ _id: new ObjectId(paymentId) });
    }
    if (!payment) {
      payment = await db.collection('payments').findOne({ id: paymentId });
    }

    if (!payment) {
      console.warn('[webhook] Payment not found for id:', paymentId);
      return NextResponse.json({ ok: true });
    }

    const payDocId = payment._id ? payment._id.toString() : payment.id;
    const now = new Date().toISOString();
    const payFilter = payment._id ? { _id: new ObjectId(payDocId) } : { id: payDocId };

    await db.collection('payments').updateOne(payFilter, {
      $set: {
        status,
        ...(status === 'paid' ? { paidAt: now } : {}),
        updatedAt: now,
      },
    });

    // Publish payment.updated
    await publishTripEvent(payment.tripId, {
      type: 'payment.updated',
      entityId: payDocId,
    });

    // If all payments for this action are now paid, advance action → 'executing'
    if (status === 'paid') {
      const allPayments = await db
        .collection('payments')
        .find({ actionId: payment.actionId })
        .toArray();

      const allPaid = allPayments.length > 0 && allPayments.every((p: any) => p.status === 'paid');

      if (allPaid) {
        let action: any = null;
        if (ObjectId.isValid(payment.actionId)) {
          action = await db.collection('actions').findOne({ _id: new ObjectId(payment.actionId) });
        }
        if (!action) {
          action = await db.collection('actions').findOne({ id: payment.actionId });
        }

        if (action) {
          const actionDocId = action._id ? action._id.toString() : action.id;
          const actionFilter = action._id ? { _id: new ObjectId(actionDocId) } : { id: actionDocId };

          await db.collection('actions').updateOne(actionFilter, {
            $set: {
              state: 'executing',
              updatedAt: now,
              version: (action.version ?? 0) + 1,
            },
          });

          await publishTripEvent(payment.tripId, {
            type: 'action.updated',
            entityId: actionDocId,
            version: (action.version ?? 0) + 1,
          });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    // Always 200 to aggregator — log, never throw
    console.error('[webhook] Processing error:', error);
    return NextResponse.json({ ok: true });
  }
}
