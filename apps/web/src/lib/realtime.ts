/**
 * Realtime utility — Person 5's core delivery.
 * Everyone (Persons 2, 3, 4) imports publishTripEvent() from here.
 *
 * Uses Ably REST API to publish to channel `trip:{tripId}`.
 * If ABLY_API_KEY is not set (local dev without credentials) the function
 * is a no-op and logs a warning — routes keep working, they just don't push.
 */

export interface TripRealtimeEvent {
  type:
    | 'node.created'
    | 'node.updated'
    | 'trip.updated'
    | 'disruption.detected'
    | 'action.updated'
    | 'payment.updated'
    | 'suraksha.sent';
  tripId: string;
  entityId: string;
  version?: number;
  ts: string;
}

/**
 * Publish an event to the Ably channel `trip:{tripId}`.
 * Fire-and-forget — the write that triggers this must already be committed
 * before this is called, so a failed publish never rolls back a DB write.
 */
export async function publishTripEvent(
  tripId: string,
  event: Omit<TripRealtimeEvent, 'tripId' | 'ts'>
): Promise<void> {
  const apiKey = process.env.ABLY_API_KEY;

  if (!apiKey) {
    console.warn('[realtime] ABLY_API_KEY not set — skipping publish', event.type);
    return;
  }

  const channel = `trip:${tripId}`;
  const payload: TripRealtimeEvent = {
    ...event,
    tripId,
    ts: new Date().toISOString(),
  };

  try {
    // Ably REST publish — no persistent connection needed from serverless
    const [keyId, keySecret] = apiKey.split(':');
    const basicAuth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

    const res = await fetch(
      `https://rest.ably.io/channels/${encodeURIComponent(channel)}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: event.type, data: payload }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error('[realtime] Ably publish failed:', res.status, errText);
    }
  } catch (err) {
    // Never throw — a dropped publish must never crash the route that called us
    console.error('[realtime] Ably publish error:', err);
  }
}

/**
 * Append an entry to the events collection (the append-only audit log).
 * seq is a monotonically increasing integer per trip — we use the current
 * count of events for that trip as a best-effort seq (good enough for v1;
 * a real counter would use a MongoDB $inc on a separate counter document).
 */
export async function appendEventLog(
  db: any,
  params: {
    tripId: string;
    actor: string;      // userId or 'system'
    type: string;       // e.g. 'node.confirmed', 'action.state_changed'
    payload: Record<string, unknown>;
  }
): Promise<void> {
  try {
    const count = await db.collection('events').countDocuments({ tripId: params.tripId });
    await db.collection('events').insertOne({
      tripId: params.tripId,
      seq: count + 1,
      actor: params.actor,
      type: params.type,
      payload: params.payload,
      ts: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[eventLog] Failed to append event log entry:', err);
  }
}
