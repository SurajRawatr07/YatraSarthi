import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { publishTripEvent } from '@/lib/realtime';

export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 });
    }

    const { tripId, toolCall } = await request.json();
    if (!tripId || !toolCall) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'tripId and toolCall are required' } }, { status: 400 });
    }

    let result: any = { status: 'success' };

    // Orchestrate tool execution by calling Person 3/4's endpoints
    if (toolCall.name === 'requestAlternatives') {
      // Mock calling Person 4's endpoint: POST /api/trips/:id/recovery-options (or similar)
      result = { 
        action: 'Requested alternatives',
        optionsFound: 2,
        message: 'Recovery options requested. The Group Panel has been updated.' 
      };
      // Stream reply via realtime
      await publishTripEvent(tripId, { type: 'trip.updated', entityId: tripId });
    } else if (toolCall.name === 'editGraph') {
      // Mock calling Person 3's endpoint: POST /api/nodes/:id or DELETE /api/nodes/:id
      result = { 
        action: 'Graph updated',
        nodeId: toolCall.arguments.nodeId,
        message: `Node ${toolCall.arguments.action} applied to graph successfully.`
      };
      // Stream reply via realtime
      await publishTripEvent(tripId, { type: 'node.updated', entityId: toolCall.arguments.nodeId });
    } else {
      result = { status: 'error', message: 'Unknown tool call' };
    }

    return NextResponse.json({ result });
  } catch (err) {
    console.error('Execute tool error:', err);
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message: 'Failed to execute tool' } }, { status: 500 });
  }
}
