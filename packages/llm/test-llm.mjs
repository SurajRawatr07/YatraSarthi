import { GoogleGenAI } from '@google/genai';
import { config } from 'dotenv';

config({ path: 'apps/web/.env' });

async function run() {
  console.log("Key:", process.env.GOOGLE_AI_STUDIO_API_KEY ? "EXISTS" : "MISSING");
  const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_STUDIO_API_KEY });
  try {
    const res = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: 'Say hello'
    });
    console.log("Result:", res.text);
  } catch (e) {
    console.error("Failed:", e.message);
  }
}
run();
