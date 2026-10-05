import type { ToolDefinition } from './tools';

// ── Booking extraction ─────────────────────────────────────────────────────────

export interface ExtractedBooking {
  type: string;
  fields: Record<string, unknown>;
  confidence: Record<string, number>;
  triggerSource?: 'vendor_cancellation' | 'delay';
}

// ── Chat / tool-calling ────────────────────────────────────────────────────────

export type ChatRole = 'user' | 'assistant' | 'tool';

export interface ChatMessage {
  role: ChatRole;
  content: string;
  toolName?: string;
}

export interface ChatToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface ChatResponse {
  toolCall?: ChatToolCall;
  clarification?: string;
}

// ── Provider interface ─────────────────────────────────────────────────────────

export interface ExtractorProvider {
  extractBooking(input: { text?: string; imageBase64?: string; mimeType?: string }): Promise<ExtractedBooking>;
  draftVendorEmail(ctx: { booking: unknown; policy: string; requestedChange: string }): Promise<{ subject: string; body: string }>;
  callTool(messages: ChatMessage[], tools: ToolDefinition[]): Promise<ChatResponse>;
}
