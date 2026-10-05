import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

/** GET /api/actions/:id — fetch a single action by its MongoDB _id */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db();

    let action = null;
    // Try ObjectId lookup first
    if (ObjectId.isValid(id)) {
      action = await db.collection('actions').findOne({ _id: new ObjectId(id) });
    }
    // Fall back to string id field (used by the fallback DB)
    if (!action) {
      action = await db.collection('actions').findOne({ id });
    }

    if (!action) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Action not found.' } },
        { status: 404 }
      );
    }

    const serialised = {
      ...action,
      id: action._id ? action._id.toString() : action.id,
      _id: undefined,
    };

    return NextResponse.json({ data: serialised });
  } catch (error) {
    console.error('[GET /api/actions/:id]', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Failed to fetch action.' } },
      { status: 500 }
    );
  }
}
