import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import { config } from 'dotenv';
config({ path: 'apps/web/.env' });

async function testGemini() {
  console.log("=== Testing Gemini ===");
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_STUDIO_API_KEY });
    const res = await ai.models.generateContent({ model: 'gemini-2.0-flash', contents: 'Test' });
    console.log("Gemini SUCCESS:", res.text);
  } catch(e) {
    console.error("Gemini FAILED:", e.message);
  }
}

async function testOpenAI() {
  console.log("\n=== Testing OpenAI ===");
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const res = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Test' }]
    });
    console.log("OpenAI SUCCESS:", res.choices[0]?.message.content);
  } catch(e) {
    console.error("OpenAI FAILED:", e.message);
  }
}

async function run() {
  await testGemini();
  await testOpenAI();
}
run();
