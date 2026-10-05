import { getExtractor } from '@yatrasarthi/llm';
import { config } from 'dotenv';
import path from 'path';

config({ path: path.join(__dirname, '../apps/web/.env') });

async function test() {
  console.log("Starting test...");
  try {
    const extractor = getExtractor();
    const result = await extractor.extractBooking({ text: "IRCTC PNR 2839401822. Train 12951 (Rajdhani Exp). Departs Mumbai Central (MMCT) 2026-10-05 17:00. Arrives New Delhi (NDLS) 2026-10-06 08:30. Passenger: Harsh, Confirmed A1-45. Happy Journey!" });
    console.log("Result:", result);
  } catch (err) {
    console.error("Test failed with error:");
    console.error(err);
  }
}

test();
