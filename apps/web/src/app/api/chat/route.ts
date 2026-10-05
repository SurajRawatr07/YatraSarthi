import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getSessionUser } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 });
    }

    const { tripId, messages } = await request.json();
    if (!tripId || !messages || messages.length === 0) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'tripId and messages are required' } }, { status: 400 });
    }

    const lastMessage = messages[messages.length - 1];

    // Mock orchestration: We would call Person 2's tool-calling layer here.
    // e.g. const response = await llmProvider.chat({ messages });
    
    // For now, if the user mentions "alternative" or "flight", mock a tool call response
    let aiResponseMsg: any = {
      id: Date.now().toString(),
      sessionId: lastMessage.sessionId,
      role: 'assistant',
      content: "I can help with that. Give me a moment to check.",
      ts: new Date().toISOString()
    };

    if (lastMessage.content.toLowerCase().includes('alternative') || lastMessage.content.toLowerCase().includes('flight')) {
      aiResponseMsg.content = "I found some potential alternatives. Should I request them from the provider?";
      aiResponseMsg.toolCalls = [{
        id: `call_${Date.now()}`,
        name: 'requestAlternatives',
        arguments: { tripId, disruptionId: 'mock_disruption_1' }
      }];
    } else if (lastMessage.content.toLowerCase().includes('cancel') || lastMessage.content.toLowerCase().includes('edit')) {
      aiResponseMsg.content = "I can modify the itinerary graph. Should I proceed?";
      aiResponseMsg.toolCalls = [{
        id: `call_${Date.now()}`,
        name: 'editGraph',
        arguments: { tripId, nodeId: 'mock_node_1', action: 'cancel' }
      }];
    }

    // Save to DB (mocking DB insert for chat history)
    const client = await clientPromise;
    const db = client.db();
    await db.collection('chat_messages').insertMany([
      { ...lastMessage, userId: user.id },
      { ...aiResponseMsg, userId: user.id }
    ]);

    return NextResponse.json({ message: aiResponseMsg });
  } catch (err) {
    console.error('Chat error:', err);
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message: 'Failed to process chat message' } }, { status: 500 });
  }
}
