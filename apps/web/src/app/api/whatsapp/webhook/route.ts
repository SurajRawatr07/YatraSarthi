import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getExtractor } from '@yatrasarthi/llm';
import { publishTripEvent } from '@/lib/realtime';
import type { NodeType } from '@yatrasarthi/types';
// Always return 200 to Twilio; errors are reported back to the user via WhatsApp reply.
export async function POST(request: Request) {
  try {
    const body = await request.text();
    const params = new URLSearchParams(body);

    const from = params.get('From') ?? '';         // e.g. "whatsapp:+919876543210"
    const msgBody = params.get('Body') ?? '';
    const mediaUrl = params.get('MediaUrl0');
    const mediaContentType = params.get('MediaContentType0');
    const phone = from.replace('whatsapp:', '');   // normalize to E.164

    const client = await clientPromise;
    const db = client.db();

    // Look up user by phone
    const user = await db.collection('users').findOne({ phone });

    // If body is a join code (short alphanumeric), bind phone → tripId
    if (/^[A-Z0-9]{4,8}$/i.test(msgBody.trim())) {
      const joinCode = msgBody.trim().toUpperCase();
      const trip = await db.collection('trips').findOne({ joinCode });
      if (trip && user) {
        await db.collection('users').updateOne(
          { _id: user._id },
          { $set: { [`whatsappBindings.${phone}`]: trip._id.toString() } }
        );
      }
      return new Response('', { status: 200 });
    }

    // Find bound tripId for this phone
    const tripId = user?.whatsappBindings?.[phone];
    if (!tripId) return new Response('', { status: 200 });

    const extractor = getExtractor();
    let extracted;

    if (mediaUrl && mediaContentType) {
      // Download Twilio media (requires Twilio auth header)
      const mediaResp = await fetch(mediaUrl, {
        headers: {
          Authorization: `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`,
        },
      });
      const buffer = await mediaResp.arrayBuffer();
      const imageBase64 = Buffer.from(buffer).toString('base64');
      extracted = await extractor.extractBooking({ imageBase64, mimeType: mediaContentType });
    } else if (msgBody) {
      extracted = await extractor.extractBooking({ text: msgBody });
    } else {
      return new Response('', { status: 200 });
    }

    if (!extracted?.type) return new Response('', { status: 200 });

    const now = new Date().toISOString();
    const doc = {
      tripId,
      ownerId: user?._id?.toString() ?? 'unknown',
      type: extracted.type as NodeType,
      label: (extracted.fields?.vendor as string) || extracted.type,
      vendor: extracted.fields?.vendor as string | undefined,
      time: (extracted.fields?.time as string) || now,
      constraintType: 'soft' as const,
      status: 'pending_review' as const,
      rawExtract: extracted.fields,
      confidence: extracted.confidence,
      ...(extracted.triggerSource ? { triggerSource: extracted.triggerSource } : {}),
      createdAt: now,
      updatedAt: now,
    };

    const insertResult = await db.collection('nodes').insertOne(doc);

    // Publish realtime so the trip timeline updates live for all members
    await publishTripEvent(tripId, { type: 'node.created', entityId: insertResult.insertedId.toString() });

    return new Response('', { status: 200 });
  } catch (err) {
    console.error('whatsapp/webhook error', err);
    return new Response('', { status: 200 }); // always 200 to Twilio
  }
}
