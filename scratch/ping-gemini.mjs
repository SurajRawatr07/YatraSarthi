import https from 'https';
import { readFileSync } from 'fs';

const env = readFileSync('apps/web/.env', 'utf-8');
const key = env.match(/GOOGLE_AI_STUDIO_API_KEY=(.*)/)[1].trim();

const req = https.request(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, res => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => console.log('Response:', data));
});
req.write(JSON.stringify({ contents: [{ parts: [{ text: "test" }] }] }));
req.end();
