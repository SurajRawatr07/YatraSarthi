import type { ToolDefinition } from './tools';

// ── Booking extraction ─────────────────────────────────────────────────────────

export interface ExtractedBooking {
  type: string;
  fields: Record<string, unknown>;
  confidence: Record<string, number>;
  /**
   * Set when the LLM detects a disruption signal in the input:
   * - "vendor_cancellation" — the booking has been cancelled by the vendor
   * - "delay"              — a delay is mentioned but the booking is not cancelled
   * Absent on normal (no-disruption) extractions.
   */
  triggerSource?: 'vendor_cancellation' | 'delay';
}

// ── Chat / tool-calling ────────────────────────────────────────────────────────

export type ChatRole = 'user' | 'assistant' | 'tool';

export interface ChatMessage {
  role: ChatRole;
  content: string;
  /** Present on role="tool" messages — the name of the tool that produced this result. */
  toolName?: string;
}

/**
 * A matched tool call returned by the LLM.
 * name:      one of the five fixed tools
 * arguments: JSON-parsed arguments as a plain object
 */
export interface ChatToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

/**
 * The result of one callTool round-trip:
 * - toolCall is set when the LLM matched a tool
 * - clarification is set when the request didn't map clearly to any tool
 * Exactly one of these will be present.
 */
export interface ChatResponse {
  toolCall?: ChatToolCall;
  clarification?: string;
}

// ── Provider interface ─────────────────────────────────────────────────────────

export interface ExtractorProvider {
  extractBooking(input: { text?: string; imageBase64?: string; mimeType?: string }): Promise<ExtractedBooking>;
  draftVendorEmail(ctx: { booking: unknown; policy: string; requestedChange: string }): Promise<{ subject: string; body: string }>;
  /**
   * Tool-calling mode (addendum §5.2).
   *
   * Given the conversation history and the fixed tool set, the LLM either:
   *   a) matches a tool and returns its name + JSON arguments, or
   *   b) produces a clarifying question when the request is ambiguous.
   *
   * The function NEVER applies a change itself — callers (Person 1's chat
   * orchestration and the individual tool endpoints) are responsible for
   * running the impact simulator and committing via the deterministic mutation
   * functions.
   */
  callTool(messages: ChatMessage[], tools: ToolDefinition[]): Promise<ChatResponse>;
}
