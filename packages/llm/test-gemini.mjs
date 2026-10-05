import { GoogleGenAI } from '@google/genai';
import { config } from 'dotenv';
config({ path: 'apps/web/.env' });
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_STUDIO_API_KEY });
ai.models.generateContent({ model: 'gemini-2.0-flash', contents: 'Test' })
  .then(res => console.log('Gemini SUCCESS:', res.text))
  .catch(err => console.error('Gemini FAILED:', err));
