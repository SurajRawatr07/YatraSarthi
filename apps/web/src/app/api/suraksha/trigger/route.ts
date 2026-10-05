import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getSessionUser } from '@/lib/auth';
import { publishTripEvent, appendEventLog } from '@/lib/realtime';

// POST /api/suraksha/trigger
// Body: { tripId, lastNodeId, nextNodeId, gps: { lat, lng }, batteryPct? }
// Returns: { data: { sentTo: EmergencyContact[], localNumbers: { national, police, state } } }
// The 5-second undo window is entirely client-side — this route only fires once the countdown completes.
export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: { code: 'AUTH_REQUIRED', message: 'Not authenticated' } }, { status: 401 });
    }

    const body = await request.json();
    const { tripId, lastNodeId, nextNodeId, gps, batteryPct, weatherRisk } = body;

    if (!tripId || !gps?.lat || !gps?.lng) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'tripId and gps (lat, lng) are required' } },
        { status: 422 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // Get the trip so we can look up lastNode / nextNode labels
    const trip = await db.collection('trips').findOne({ id: tripId } as any);
    const lastNode = lastNodeId
      ? await db.collection('nodes').findOne({ id: lastNodeId } as any)
      : null;
    const nextNode = nextNodeId
      ? await db.collection('nodes').findOne({ id: nextNodeId } as any)
      : null;

    // Build the Suraksha payload message
    const lastLabel = lastNode?.label ?? lastNodeId ?? 'last known stop';
    const nextLabel = nextNode?.label ?? nextNodeId ?? 'next stop';
    const locationLine = `GPS: ${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}`;
    const battLine = batteryPct != null ? ` | Battery: ${batteryPct}%` : '';
    const weatherLine = weatherRisk ? `\n⚠️ WEATHER RISK: Active` : '';
    const message =
      `🚨 SURAKSHA ALERT from ${user.name || user.phone}\n` +
      `Last reached: ${lastLabel}\n` +
      `Heading to: ${nextLabel}\n` +
      `Location: ${locationLine}${battLine}${weatherLine}`;

    const contacts = user.emergencyContacts ?? [];

    // Send via Twilio to each contact (SMS or WhatsApp)
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_FROM_NUMBER;

    console.log('[DEBUG] twilio params:', {
      hasSid: !!twilioSid,
      hasToken: !!twilioToken,
      twilioFrom,
      contactCount: contacts.length
    });

    if (twilioSid && twilioToken && twilioFrom && contacts.length > 0) {
      const results = await Promise.allSettled(
        contacts.map(async (contact: { phone: string; deliveryMethod: string }) => {
          const to =
            contact.deliveryMethod === 'whatsapp'
              ? `whatsapp:${contact.phone}`
              : contact.phone;
          const from =
            contact.deliveryMethod === 'whatsapp'
              ? `whatsapp:${twilioFrom}`
              : twilioFrom;

          const formBody = new URLSearchParams({ To: to, From: from, Body: message });
          const res = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
            {
              method: 'POST',
              headers: {
                Authorization: `Basic ${Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: formBody.toString(),
            }
          );
          
          if (!res.ok) {
            const errText = await res.text();
            console.error(`[suraksha] Twilio error for ${to}: ${res.status} ${errText}`);
          } else {
            console.log(`[suraksha] Successfully sent Twilio alert to ${to}`);
          }
        })
      );
    } else if (contacts.length > 0) {
      // No Twilio creds — log in dev
      console.log('[suraksha] Would send to contacts:', contacts.map((c: any) => c.phone));
      console.log('[suraksha] Message:', message);
    }

    // Append event log
    await appendEventLog(db, {
      tripId,
      actor: user.id,
      type: 'suraksha.triggered',
      payload: { gps, lastNodeId, nextNodeId, batteryPct, weatherRisk, contactCount: contacts.length },
    });

    // Publish realtime so other group members can see "X used Suraksha"
    await publishTripEvent(tripId, { type: 'suraksha.sent', entityId: user.id });

    // Local emergency numbers by state (minimal set; extend with a proper lookup in production)
    const localNumbers = resolveLocalNumbers(gps);

    return NextResponse.json({
      data: {
        sentTo: contacts,
        localNumbers,
      },
    });
  } catch (err) {
    console.error('suraksha/trigger error', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Failed to trigger Suraksha' } },
      { status: 500 }
    );
  }
}

/**
 * Resolve state-level emergency numbers from GPS.
 * v1 returns national defaults; a production build would reverse-geocode
 * and look up the state-specific helpline from a small lookup table.
 */
function resolveLocalNumbers(_gps: { lat: number; lng: number }) {
  return {
    national: '112',
    police: '100',
    state: '112', // placeholder — extend with reverse-geocode lookup
  };
}
