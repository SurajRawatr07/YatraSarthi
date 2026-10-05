import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

/**
 * GET /api/trips/:id/group
 * Returns real member data from the DB — who is on which leg, shared nodes, and the weakest link.
 * Previously returned hardcoded Tanvi/Priya mock; now reads from `trips`, `users`, and `nodes`.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db();

    // 1. Load the trip to get memberIds
    const trip = await db.collection('trips').findOne({ _id: new ObjectId(id) });
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    const memberIds: string[] = trip.memberIds ?? [];

    // 2. Load user docs for all members
    const userDocs = memberIds.length > 0
      ? await db.collection('users').find({
          $or: [
            { _id: { $in: memberIds.map(m => { try { return new ObjectId(m); } catch { return m; } }) } },
            { id: { $in: memberIds } },
          ],
        }).toArray()
      : [];

    // 3. Load all nodes for this trip, sorted by time
    const allNodes = await db.collection('nodes').find({ tripId: id }).sort({ time: 1 }).toArray();

    // 4. For each member, find their most recently active / upcoming node
    const memberStatuses = userDocs.map((u: any) => {
      const userId = u._id.toString();
      // Nodes owned by this member or shared
      const memberNodes = allNodes.filter(
        (n: any) => n.ownerId === userId || (n.sharedByMemberIds ?? []).includes(userId)
      );

      // The "current leg" is the first node that is not yet confirmed (pending_review, on_track, at_risk, broken)
      const currentNode =
        memberNodes.find((n: any) => ['on_track', 'at_risk', 'broken', 'pending_review'].includes(n.status)) ??
        memberNodes[memberNodes.length - 1];

      // Derive a per-member status from their worst node status
      const statusPriority: Record<string, number> = { broken: 4, at_risk: 3, pending_review: 2, on_track: 1, confirmed: 0 };
      const worstStatus = memberNodes.reduce((worst: string, n: any) => {
        return (statusPriority[n.status] ?? 0) > (statusPriority[worst] ?? 0) ? n.status : worst;
      }, 'on_track');

      return {
        memberId: userId,
        name: u.name || u.phone || 'Traveler',
        currentLeg: currentNode?.label ?? 'No bookings yet',
        currentNodeId: currentNode?._id?.toString() ?? null,
        status: worstStatus,
      };
    });

    // 5. Find shared nodes (nodes with sharedByMemberIds length > 1)
    const sharedNodes = allNodes
      .filter((n: any) => Array.isArray(n.sharedByMemberIds) && n.sharedByMemberIds.length > 1)
      .map((n: any) => ({
        nodeId: n._id.toString(),
        label: n.label,
        sharedByCount: n.sharedByMemberIds.length,
      }));

    // 6. Find the weakest link — member with the worst status
    const statusPriority: Record<string, number> = { broken: 4, at_risk: 3, pending_review: 2, on_track: 1, confirmed: 0 };
    const weakestMember = memberStatuses.reduce(
      (weakest: typeof memberStatuses[0] | null, m: typeof memberStatuses[0]) =>
        (statusPriority[m.status] ?? 0) > (statusPriority[weakest?.status ?? 'on_track'] ?? 0) ? m : weakest,
      memberStatuses[0] ?? null
    );

    return NextResponse.json({
      data: {
        members: memberStatuses,
        sharedNodes,
        weakestLinkMemberId: weakestMember?.memberId ?? null,
      },
    });
  } catch (error) {
    console.error('[group] Failed to fetch group:', error);
    return NextResponse.json({ error: 'Failed to fetch group' }, { status: 500 });
  }
}
