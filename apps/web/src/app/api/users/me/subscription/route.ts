import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getSessionUser } from '@/lib/auth';

// GET /api/users/me/subscription — return subscription status (I3)
// Returns: { data: { tier: "free" | "pro", expiresAt?: string } }
export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: { code: 'AUTH_REQUIRED', message: 'Not authenticated' } }, { status: 401 });
    }
    return NextResponse.json({ data: user.subscription ?? { tier: 'free' } });
  } catch (err) {
    console.error('subscription GET error', err);
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to fetch subscription' } }, { status: 500 });
  }
}
