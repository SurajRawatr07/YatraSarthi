import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getSessionUser } from '@/lib/auth';
import type { EmergencyContact } from '@yatrasarthi/types';

// GET /api/users/me/emergency-contacts — return current emergency contacts (H4)
// PUT /api/users/me/emergency-contacts — full replace (H4 is a small list, simpler than per-item CRUD)
// Body: { contacts: EmergencyContact[] }

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: { code: 'AUTH_REQUIRED', message: 'Not authenticated' } }, { status: 401 });
    }
    return NextResponse.json({ data: { contacts: user.emergencyContacts ?? [] } });
  } catch (err) {
    console.error('emergency-contacts GET error', err);
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to fetch emergency contacts' } }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: { code: 'AUTH_REQUIRED', message: 'Not authenticated' } }, { status: 401 });
    }

    const body = await request.json();
    const contacts: EmergencyContact[] = body.contacts ?? [];

    // Basic validation
    for (const c of contacts) {
      if (!c.name || !c.phone || !['sms', 'whatsapp'].includes(c.deliveryMethod)) {
        return NextResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Each contact must have name, phone, and deliveryMethod ("sms" | "whatsapp")',
            },
          },
          { status: 422 }
        );
      }
      // Ensure each contact has an id
      if (!c.id) {
        (c as any).id = `ec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      }
    }

    const client = await clientPromise;
    const db = client.db();

    const filter = { $or: [{ id: user.id }, { phone: user.phone }] } as any;
    await db.collection('users').updateOne(filter, {
      $set: { emergencyContacts: contacts, updatedAt: new Date().toISOString() },
    });

    return NextResponse.json({ data: { contacts } });
  } catch (err) {
    console.error('emergency-contacts PUT error', err);
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to update emergency contacts' } }, { status: 500 });
  }
}
