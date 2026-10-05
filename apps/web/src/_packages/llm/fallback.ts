import type { ExtractedBooking, ExtractorProvider, ChatMessage, ChatResponse } from './types';
import type { ToolDefinition } from './tools';

export class FallbackAdapter implements ExtractorProvider {
  constructor(
    private primary: ExtractorProvider,
    private secondary: ExtractorProvider,
    private primaryName = 'Gemini',
    private secondaryName = 'OpenAI',
  ) {}

  async extractBooking(input: { text?: string; imageBase64?: string; mimeType?: string }): Promise<ExtractedBooking> {
    try {
      return await this.primary.extractBooking(input);
    } catch (err) {
      console.warn(`[llm] ${this.primaryName} extractBooking failed — falling back to ${this.secondaryName}:`, (err as Error).message);
      return this.secondary.extractBooking(input);
    }
  }

  async draftVendorEmail(ctx: { booking: unknown; policy: string; requestedChange: string }): Promise<{ subject: string; body: string }> {
    try {
      return await this.primary.draftVendorEmail(ctx);
    } catch (err) {
      console.warn(`[llm] ${this.primaryName} draftVendorEmail failed — falling back to ${this.secondaryName}:`, (err as Error).message);
      return this.secondary.draftVendorEmail(ctx);
    }
  }

  async callTool(messages: ChatMessage[], tools: ToolDefinition[]): Promise<ChatResponse> {
    try {
      return await this.primary.callTool(messages, tools);
    } catch (err) {
      console.warn(`[llm] ${this.primaryName} callTool failed — falling back to ${this.secondaryName}:`, (err as Error).message);
      return this.secondary.callTool(messages, tools);
    }
  }
}
