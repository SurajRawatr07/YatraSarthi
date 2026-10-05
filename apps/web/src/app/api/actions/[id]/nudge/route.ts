import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getSessionUser } from '@/lib/auth';

/**
 * POST /api/actions/:id/nudge
 *
 * Appends the current timestamp to vendorDraft.nudgedAt[].
 * Does NOT change state.
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
    const now = new Date().toISOString();
    const filter = action._id ? { _id: new ObjectId(actionId) } : { id: actionId };

    // Build the updated nudgedAt array manually (fallback DB doesn't support $push)
    const existingDraft = action.vendorDraft ?? {};
    const nudgedAt: string[] = Array.isArray(existingDraft.nudgedAt)
      ? [...existingDraft.nudgedAt, now]
      : [now];

    await db.collection('actions').updateOne(filter, {
      $set: {
        vendorDraft: { ...existingDraft, nudgedAt },
        updatedAt: now,
      },
    });

    const updated = await (action._id
      ? db.collection('actions').findOne({ _id: new ObjectId(actionId) })
      : db.collection('actions').findOne({ id: actionId }));

    const serialised = {
      ...updated,
      id: updated?._id ? updated._id.toString() : updated?.id,
      _id: undefined,
    };

    return NextResponse.json({ data: serialised });
  } catch (error) {
    console.error('[POST /api/actions/:id/nudge]', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Failed to nudge vendor.' } },
      { status: 500 }
    );
  }
}
