import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getSessionUser } from '@/lib/auth';

// POST /api/users/me/subscription/upgrade
// Body: { plan: "per_trip" | "annual"; tripId?: string }
// Returns: { data: { paymentLinkUrl: string; paymentId: string } }
//
// This is a Payment against the user, not a trip action — separate thin wrapper
// rather than overloading /api/payments/create-links (per the API contract, Section 7).
// Uses the same aggregator as Person 4 (Razorpay/Cashfree test mode).

const PLAN_AMOUNTS: Record<string, number> = {
  per_trip: 9900,   // ₹99 in paise
  annual: 59900,    // ₹599 in paise
};

export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: { code: 'AUTH_REQUIRED', message: 'Not authenticated' } }, { status: 401 });
    }

    const body = await request.json();
    const { plan, tripId } = body;

    if (!plan || !PLAN_AMOUNTS[plan]) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'plan must be "per_trip" or "annual"' } },
        { status: 422 }
      );
    }

    if (plan === 'per_trip' && !tripId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'tripId is required for per_trip plan' } },
        { status: 422 }
      );
    }

    const amount = PLAN_AMOUNTS[plan];
    const paymentId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    let paymentLinkUrl: string;

    if (razorpayKeyId && razorpayKeySecret) {
      // Create a real Razorpay Payment Link
      const auth = Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64');
      const resp = await fetch('https://api.razorpay.com/v1/payment_links', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          currency: 'INR',
          description: `YatraSarthi ${plan === 'annual' ? 'Annual Pro' : 'Per-Trip Pro'}`,
          customer: { name: user.name, contact: user.phone },
          reminder_enable: false,
          notes: { userId: user.id, plan, tripId: tripId ?? '' },
          callback_url: `${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/api/users/me/subscription/webhook`,
          callback_method: 'get',
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        paymentLinkUrl = data.short_url ?? data.id;
      } else {
        // Fall through to mock link
        paymentLinkUrl = `https://test.razorpay.com/pay/${paymentId}`;
      }
    } else {
      // Test-mode mock link
      paymentLinkUrl = `https://test.razorpay.com/pay/${paymentId}`;
    }

    // Store the pending subscription payment in DB
    const client = await clientPromise;
    const db = client.db();

    await db.collection('payments').insertOne({
      id: paymentId,
      userId: user.id,
      type: 'subscription',
      plan,
      tripId: tripId ?? null,
      amount,
      status: 'pending',
      paymentLinkUrl,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ data: { paymentLinkUrl, paymentId } }, { status: 201 });
  } catch (err) {
    console.error('subscription/upgrade POST error', err);
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to create upgrade link' } }, { status: 500 });
  }
}
