import OpenAI from 'openai';
import type { ExtractedBooking, ExtractorProvider, ChatMessage, ChatResponse } from './types';
import type { ToolDefinition } from './tools';

const EXTRACTION_PROMPT = `Extract booking details from the provided document. Return a JSON object with:
- type: one of "flight", "train", "bus", "cab", "hotel", "phantom"
- fields: all extracted key-value pairs (pnr, vendor, from, to, time, date, booking_ref, passenger_name, etc.)
- confidence: per-field confidence score between 0 and 1
- triggerSource (optional): if the document indicates a disruption, set this to one of:
    "vendor_cancellation" — if the booking has been cancelled by the vendor
    "delay"              — if a delay is mentioned but the booking is still active
  Omit triggerSource entirely if this is a normal booking with no disruption signal.`;

export class OpenAIAdapter implements ExtractorProvider {
  private client: OpenAI;
  private model: string;

  constructor() {
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
    this.model = process.env.OPENAI_MODEL || 'gpt-4o';
  }

  async extractBooking(input: { text?: string; imageBase64?: string; mimeType?: string }): Promise<ExtractedBooking> {
    const userContent: OpenAI.ChatCompletionContentPart[] = [{ type: 'text', text: EXTRACTION_PROMPT }];
    if (input.imageBase64 && input.mimeType) {
      userContent.push({ type: 'image_url', image_url: { url: `data:${input.mimeType};base64,${input.imageBase64}` } });
    } else if (input.text) {
      userContent.push({ type: 'text', text: `Document:\n${input.text}` });
    }
    const result = await this.client.chat.completions.create({ model: this.model, response_format: { type: 'json_object' }, messages: [{ role: 'user', content: userContent }] });
    const raw = result.choices[0]?.message.content ?? '{}';
    return JSON.parse(raw) as ExtractedBooking;
  }

  async draftVendorEmail(ctx: { booking: unknown; policy: string; requestedChange: string }): Promise<{ subject: string; body: string }> {
    const result = await this.client.chat.completions.create({
      model: this.model,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: `Draft a professional vendor email for a travel booking change.\nBooking: ${JSON.stringify(ctx.booking)}\nPolicy: ${ctx.policy}\nRequested change: ${ctx.requestedChange}\nReturn JSON: { "subject": "...", "body": "..." }` }],
    });
    const raw = result.choices[0]?.message.content ?? '{}';
    return JSON.parse(raw);
  }

  async callTool(messages: ChatMessage[], tools: ToolDefinition[]): Promise<ChatResponse> {
    const oaiMessages: OpenAI.ChatCompletionMessageParam[] = messages.map(m => {
      if (m.role === 'tool') return { role: 'tool', content: m.content, tool_call_id: m.toolName ?? 'tool' };
      return { role: m.role as 'user' | 'assistant', content: m.content };
    });
    const oaiTools: OpenAI.ChatCompletionTool[] = tools.map(t => ({ type: 'function' as const, function: { name: t.name, description: t.description, parameters: t.parameters } }));
    const result = await this.client.chat.completions.create({ model: this.model, messages: oaiMessages, tools: oaiTools, tool_choice: 'auto' });
    const choice = result.choices[0];
    const toolCalls = choice?.message?.tool_calls;
    if (toolCalls && toolCalls.length > 0) {
      const tc = toolCalls[0];
      let args: Record<string, unknown> = {};
      try { args = JSON.parse(tc.function.arguments); } catch { /* empty args */ }
      return { toolCall: { name: tc.function.name, arguments: args } };
    }
    const text = choice?.message?.content?.trim() ?? "I'm not sure I understood. Could you rephrase?";
    return { clarification: text };
  }
}
