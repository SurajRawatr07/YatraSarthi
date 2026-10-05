import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

/**
 * GET /api/payments/[actionId]
 *
 * Fetches all payment records for a given actionId.
 * Response: { data: { payments: Payment[]; allPaid: boolean; deadlineAt: string } }
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ actionId: string }> }
) {
  try {
    const { actionId } = await params;
    const client = await clientPromise;
    const db = client.db();

    // Support both ObjectId and plain-string actionId values stored in DB
    const payments = await db
      .collection('payments')
      .find({ actionId })
      .toArray();

    const serialised = payments.map((p: any) => ({
      ...p,
      id: p._id ? p._id.toString() : p.id,
      _id: undefined,
    }));

    const allPaid =
      serialised.length > 0 && serialised.every((p: any) => p.status === 'paid');

    const deadlineAt =
      serialised[0]?.deadlineAt ?? new Date(Date.now() + 20 * 60 * 1000).toISOString();

    return NextResponse.json({ data: { payments: serialised, allPaid, deadlineAt } });
  } catch (error) {
    console.error('[GET /api/payments/:actionId]', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Failed to fetch payments.' } },
      { status: 500 }
    );
  }
}
