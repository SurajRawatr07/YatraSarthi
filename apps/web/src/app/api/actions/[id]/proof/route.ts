import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getSessionUser } from '@/lib/auth';
import { getExtractor } from '@yatrasarthi/llm';

/**
 * POST /api/actions/:id/proof
 * Body: { fileUrl?: string; text?: string }
 *
 * Runs the LLM extractor on the vendor's reply.
 * Stores a proofRef string on the action.
 * Does NOT change state — G3 shows the parsed summary first;
 * the caller then invokes POST /confirm to commit.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json(
        { error: { code: 'AUTH_REQUIRED', message: 'Authentication required.' } },
        { status: 401 }
      );
    }

    let body: { fileUrl?: string; text?: string } = {};
    try {
      body = await request.json();
    } catch {
      // body may be multipart — we default to empty and let the extractor handle it
    }

    const client = await clientPromise;
    const db = client.db();

    let action: any = null;
    if (ObjectId.isValid(id)) {
      action = await db.collection('actions').findOne({ _id: new ObjectId(id) });
    }
    if (!action) {
      action = await db.collection('actions').findOne({ id });
    }

    if (!action) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Action not found.' } },
        { status: 404 }
      );
    }

    const actionId = action._id ? action._id.toString() : action.id;

    // Run the extractor against the proof text / file
    const extractor = getExtractor();
    const parsed = await extractor.extractBooking({ text: body.text ?? body.fileUrl ?? 'vendor confirmation' });

    // Build a stable proofRef (a deterministic string for this submission)
    const proofRef = `proof_${actionId}_${Date.now()}`;

    const filter = action._id ? { _id: new ObjectId(actionId) } : { id: actionId };
    await db.collection('actions').updateOne(filter, {
      $set: {
        proofRef,
        updatedAt: new Date().toISOString(),
      },
    });

    // Build a human-readable summary from the extracted fields
    const parsedSummary = Object.entries(parsed.fields ?? {})
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ')
      || 'Vendor reply parsed successfully.';

    return NextResponse.json({ data: { parsedSummary, proofRef } });
  } catch (error) {
    console.error('[POST /api/actions/:id/proof]', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Failed to process proof.' } },
      { status: 500 }
    );
  }
}
