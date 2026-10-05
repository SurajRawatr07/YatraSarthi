/**
 * YatraSarthi Background Worker
 *
 * Runs two recurring jobs:
 *
 * 1. Phantom Node Poller (every 5 minutes)
 *    - Finds all nodes with status 'pending_review' that are within 3 hours of their scheduled time.
 *    - Flags them as 'at_risk' and publishes a realtime warning so the user can confirm or replace.
 *
 * 2. Payment Timeout Sweep (every 10 minutes)
 *    - Finds payments with status 'pending' where deadlineAt has passed.
 *    - Marks them as 'failed'.
 *    - If ALL payments for an action are now failed/refunded, moves that action back to 'proposed'
 *      so the group can try again.
 *
 * Environment variables required:
 *   MONGODB_URI       - MongoDB Atlas connection string
 *   ABLY_API_KEY      - Ably REST publish key (optional; skipped gracefully if absent)
 */

import 'dotenv/config';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('[worker] MONGODB_URI is not set — exiting.');
  process.exit(1);
}

let client: MongoClient;

async function getDb() {
  if (!client) {
    client = new MongoClient(MONGODB_URI!);
    await client.connect();
    console.log('[worker] Connected to MongoDB');
  }
  return client.db();
}

// ─── Realtime helper (same logic as apps/web/src/lib/realtime.ts, inlined) ───

async function publishEvent(tripId: string, type: string, entityId: string) {
  const apiKey = process.env.ABLY_API_KEY;
  if (!apiKey) {
    console.warn('[worker:realtime] ABLY_API_KEY not set — skipping publish', type);
    return;
  }
  const channel = `trip:${tripId}`;
  const [keyId, keySecret] = apiKey.split(':');
  const basicAuth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  try {
    const res = await fetch(
      `https://rest.ably.io/channels/${encodeURIComponent(channel)}/messages`,
      {
        method: 'POST',
        headers: { Authorization: `Basic ${basicAuth}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: type, data: { type, tripId, entityId, ts: new Date().toISOString() } }),
      }
    );
    if (!res.ok) console.error('[worker:realtime] Ably publish failed:', res.status, await res.text());
  } catch (err) {
    console.error('[worker:realtime] Ably publish error:', err);
  }
}

// ─── Job 1: Phantom Node Poller ────────────────────────────────────────────

async function runPhantomPoller() {
  console.log('[worker:phantom] Running phantom node poll...');
  try {
    const db = await getDb();
    const now = new Date();
    const windowEnd = new Date(now.getTime() + 3 * 60 * 60 * 1000); // 3 hours from now

    // Find pending_review nodes whose scheduled time is within the next 3 hours
    const phantomNodes = await db.collection('nodes').find({
      status: 'pending_review',
      type: 'phantom',
      time: { $gte: now.toISOString(), $lte: windowEnd.toISOString() },
    }).toArray();

    if (phantomNodes.length === 0) {
      console.log('[worker:phantom] No phantom nodes in the T-3h window.');
      return;
    }

    console.log(`[worker:phantom] Found ${phantomNodes.length} phantom node(s) in the T-3h window.`);

    for (const node of phantomNodes) {
      const nodeId = node._id.toString();
      const tripId = node.tripId;

      // Flip to at_risk — the user needs to confirm or replace this leg
      await db.collection('nodes').updateOne(
        { _id: node._id },
        { $set: { status: 'at_risk', phantomWarningAt: now.toISOString() } }
      );

      // Append event log
      const count = await db.collection('events').countDocuments({ tripId });
      await db.collection('events').insertOne({
        tripId,
        seq: count + 1,
        actor: 'system',
        type: 'node.phantom_warning',
        payload: { nodeId, label: node.label, scheduledTime: node.time },
        ts: now.toISOString(),
      });

      // Publish realtime warning
      await publishEvent(tripId, 'node.updated', nodeId);

      console.log(`[worker:phantom] Flagged node ${nodeId} (${node.label}) as at_risk for trip ${tripId}`);
    }
  } catch (err) {
    console.error('[worker:phantom] Error during phantom poll:', err);
  }
}

// ─── Job 2: Payment Timeout Sweep ──────────────────────────────────────────

async function runPaymentTimeoutSweep() {
  console.log('[worker:payments] Running payment timeout sweep...');
  try {
    const db = await getDb();
    const now = new Date();

    // Find all pending payments whose deadline has passed
    const expiredPayments = await db.collection('payments').find({
      status: 'pending',
      deadlineAt: { $lte: now.toISOString() },
    }).toArray();

    if (expiredPayments.length === 0) {
      console.log('[worker:payments] No expired payments found.');
      return;
    }

    console.log(`[worker:payments] Found ${expiredPayments.length} expired payment(s).`);

    // Group expired payments by actionId
    const byAction = new Map<string, typeof expiredPayments>();
    for (const p of expiredPayments) {
      const key = p.actionId;
      if (!byAction.has(key)) byAction.set(key, []);
      byAction.get(key)!.push(p);
    }

    for (const [actionId, payments] of byAction) {
      // Mark expired payments as failed
      const expiredIds = payments.map((p: any) => p._id);
      await db.collection('payments').updateMany(
        { _id: { $in: expiredIds } },
        { $set: { status: 'failed', failedAt: now.toISOString() } }
      );

      // Check if ALL payments for this action are now non-pending
      const stillPending = await db.collection('payments').countDocuments({
        actionId,
        status: 'pending',
      });

      if (stillPending === 0) {
        // Roll the action back to 'proposed' so the group can try again
        let action: any = null;
        try { action = await db.collection('actions').findOne({ _id: new (require('mongodb').ObjectId)(actionId) }); } catch {}
        if (!action) action = await db.collection('actions').findOne({ id: actionId });

        if (action) {
          const filter = action._id
            ? { _id: action._id }
            : { id: actionId };

          await db.collection('actions').updateOne(
            filter,
            { $set: { state: 'proposed', updatedAt: now.toISOString() } }
          );

          const tripId: string = action.tripId;
          // Append event log
          const count = await db.collection('events').countDocuments({ tripId });
          await db.collection('events').insertOne({
            tripId,
            seq: count + 1,
            actor: 'system',
            type: 'action.payment_timeout',
            payload: { actionId, expiredCount: payments.length },
            ts: now.toISOString(),
          });

          await publishEvent(tripId, 'action.updated', actionId);
          console.log(`[worker:payments] Action ${actionId} rolled back to 'proposed' (all payments expired).`);
        }
      }
    }
  } catch (err) {
    console.error('[worker:payments] Error during payment sweep:', err);
  }
}

// ─── Scheduler ─────────────────────────────────────────────────────────────

function schedule(label: string, job: () => Promise<void>, intervalMs: number) {
  console.log(`[worker] Scheduling "${label}" every ${intervalMs / 1000}s`);
  job(); // run immediately on startup
  setInterval(() => {
    job().catch(err => console.error(`[worker] Unhandled error in "${label}":`, err));
  }, intervalMs);
}

// ─── Entry point ────────────────────────────────────────────────────────────

console.log('[worker] YatraSarthi worker starting...');

schedule('Phantom Node Poller',    runPhantomPoller,        5  * 60 * 1000); // every 5 min
schedule('Payment Timeout Sweep',  runPaymentTimeoutSweep,  10 * 60 * 1000); // every 10 min

// Keep the process alive
process.on('SIGTERM', async () => {
  console.log('[worker] SIGTERM received — shutting down gracefully.');
  if (client) await client.close();
  process.exit(0);
});
