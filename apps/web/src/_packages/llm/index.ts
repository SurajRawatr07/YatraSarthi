export type {
  ExtractedBooking,
  ExtractorProvider,
  ChatMessage,
  ChatToolCall,
  ChatResponse,
  ChatRole,
} from './types';

export { FallbackAdapter } from './fallback';
export { CHAT_TOOLS, toGeminiFunctionDeclarations } from './tools';
export type { ToolDefinition } from './tools';

import { GeminiAdapter } from './gemini';
import { OpenAIAdapter } from './openai';
import { FallbackAdapter } from './fallback';
import type { ExtractorProvider } from './types';

export function getExtractor(): ExtractorProvider {
  const provider = process.env.LLM_PROVIDER ?? 'fallback';
  if (provider === 'openai') return new OpenAIAdapter();
  if (provider === 'gemini') return new GeminiAdapter();
  return new FallbackAdapter(new GeminiAdapter(), new OpenAIAdapter());
}
