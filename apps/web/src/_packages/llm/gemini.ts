import { GoogleGenAI } from '@google/genai';
import type { ExtractedBooking, ExtractorProvider, ChatMessage, ChatResponse } from './types';
import { toGeminiFunctionDeclarations } from './tools';
import type { ToolDefinition } from './tools';

const EXTRACTION_PROMPT = `Extract booking details from the provided document. Return a JSON object with:
- type: one of "flight", "train", "bus", "cab", "hotel", "phantom"
- fields: all extracted key-value pairs (pnr, vendor, from, to, time, date, booking_ref, passenger_name, etc.)
- confidence: per-field confidence score between 0 and 1
- triggerSource (optional): if the document indicates a disruption, set this to one of:
    "vendor_cancellation" — if the booking has been cancelled by the vendor
    "delay"              — if a delay is mentioned but the booking is still active
  Omit triggerSource entirely if this is a normal booking with no disruption signal.

Return ONLY valid JSON. No markdown, no explanation.`;

export class GeminiAdapter implements ExtractorProvider {
  private client: GoogleGenAI;
  private model: string;

  constructor() {
    this.client = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_STUDIO_API_KEY! });
    this.model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  }

  async extractBooking(input: { text?: string; imageBase64?: string; mimeType?: string }): Promise<ExtractedBooking> {
    const parts: object[] = [{ text: EXTRACTION_PROMPT }];
    if (input.imageBase64 && input.mimeType) {
      parts.push({ inlineData: { mimeType: input.mimeType, data: input.imageBase64 } });
    } else if (input.text) {
      parts.push({ text: `Document:\n${input.text}` });
    }
    const result = await this.client.models.generateContent({ model: this.model, contents: [{ role: 'user', parts }] });
    const raw = result.text?.trim() ?? '{}';
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const cleaned = match ? match[1].trim() : raw.trim();
    return JSON.parse(cleaned) as ExtractedBooking;
  }

  async draftVendorEmail(ctx: { booking: unknown; policy: string; requestedChange: string }): Promise<{ subject: string; body: string }> {
    const prompt = `Draft a professional vendor email for a travel booking change.\nBooking details: ${JSON.stringify(ctx.booking)}\nPolicy: ${ctx.policy}\nRequested change: ${ctx.requestedChange}\n\nReturn JSON: { "subject": "...", "body": "..." }. No markdown.`;
    const result = await this.client.models.generateContent({ model: this.model, contents: [{ role: 'user', parts: [{ text: prompt }] }] });
    const raw = result.text?.trim() ?? '{}';
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const cleaned = match ? match[1].trim() : raw.trim();
    return JSON.parse(cleaned);
  }

  async callTool(messages: ChatMessage[], tools: ToolDefinition[]): Promise<ChatResponse> {
    const contents = messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
    const functionDeclarations = toGeminiFunctionDeclarations(tools);
    const result = await this.client.models.generateContent({
      model: this.model,
      contents,
      // @ts-expect-error — tools typing varies across @google/genai versions
      tools: [{ functionDeclarations }],
    });
    const candidate = result.candidates?.[0];
    const parts = candidate?.content?.parts ?? [];
    for (const part of parts) {
      const fc = (part as Record<string, unknown>).functionCall as { name?: string; args?: Record<string, unknown> } | undefined;
      if (fc?.name) return { toolCall: { name: fc.name, arguments: fc.args ?? {} } };
    }
    const text = result.text?.trim() ?? "I'm not sure I understood. Could you rephrase?";
    return { clarification: text };
  }
}
