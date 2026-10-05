import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const NUGEN_BASE = 'https://api.nugen.in';

const CORPUS_TEXT = `YatraSarthi Travel Policy & Passenger Rights Corpus

SECTION 1: DGCA PASSENGER RIGHTS

Flight Delay Compensation (DGCA CAR Section 3, Series M Part IV):
- Delay 2-4 hours: Airlines must offer meal vouchers.
- Delay over 4 hours: Full refund with no cancellation penalty.
- Delay over 6 hours (8PM-3AM flights): Hotel accommodation required.
- Weather delays: Force majeure — meal vouchers owed but no monetary compensation.

Flight Cancellation Rights:
- Cancellation under 2 weeks before departure: Full refund OR re-routing at no cost.
- Cancellation under 24 hours: Full refund + 200% of basic fare (max INR 10,000) for under 1500 km flights.
- Force majeure cancellations (weather/disaster): Full refund only, no extra compensation.

SECTION 2: IRCTC/INDIAN RAILWAYS REFUND POLICY

- TDR (Ticket Deposit Receipt): Filed for train delay over 3 hours. Full refund if passenger does not travel.
- Flood/disaster delays: IRCTC grants full refund without penalty.
- Cancellation over 48 hours before: 25% fare deducted (min INR 90 clerkage).
- Cancellation 48-12 hours before: 50% fare deducted.

SECTION 3: HOTEL CANCELLATION POLICIES

- Free cancellation: Most hotels allow free cancellation up to 48 hours before check-in.
- Late cancellation (under 24 hours): One-night charge typically applied.
- Force majeure: Hotels in disaster zones must refund or offer credit.

SECTION 4: YATRASARTHI RECOVERY RANKING LOGIC

Recovery plan ranking priority:
1. Minimum additional cost to traveller
2. Minimum additional time added
3. Maximum confidence/feasibility score
4. Preservation of trip destination

Status meanings:
- GREEN: Buffer intact, connection safe.
- AMBER (at-risk): Buffer being consumed but connection still possible.
- RED (broken): Buffer fully consumed. Connection impossible. Recovery required.

triggerSource field: Every disruption is tagged vendor_cancellation, weather, or user_action. Determines which compensation rules apply.

SECTION 5: WEATHER IMPACT RULES

Rainfall impact:
- 10-30mm/hr: Flight delays 30-60 min likely.
- Over 30mm/hr: Cancellations likely, train delays 2-4 hours, roads impassable.
- Over 50mm/hr: Airport ground stops, NDRF deployed.

SECTION 6: FAQ

Q: Can I get compensation for weather delay?
A: Weather is force majeure under DGCA. Meal vouchers for over 2hr, full refund for over 4hr, but no monetary compensation beyond ticket price.

Q: My train was delayed due to flooding. Can I get a full refund?
A: Yes. File a TDR within 72 hours. IRCTC grants full refund for weather/disaster delays.

Q: What does amber status mean?
A: Amber means connection is still possible but the upstream delay is consuming the buffer. If the delay increases further, the node breaks to RED.

Q: Why is one recovery option cheaper?
A: YatraSarthi ranks by minimum additional cost first. A replacement train on the same route is usually cheaper than a replacement flight. Weather waivers may make rebooking free.

Q: What is confidence score?
A: Confidence reflects how likely a recovery option is to be available and executable. 95% means confirmed available. 80% means likely but may require seat release.

Q: Is a non-refundable hotel covered in a natural disaster?
A: Not automatically, but most OTAs have force majeure policies for declared disaster zones. YatraSarthi surfaces this option and drafts the waiver request.
`;

export async function POST() {
  try {
    const apiKey = process.env.NUGEN_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'NUGEN_API_KEY not set' }, { status: 503 });
    }

    const authHeader = { 'Authorization': `Bearer ${apiKey}` };

    // Step 1: Upload corpus as multipart/form-data
    console.log('[nugen/align] Uploading corpus…');
    const tmpPath = path.join(os.tmpdir(), 'yatrasarthi_corpus.txt');
    fs.writeFileSync(tmpPath, CORPUS_TEXT, 'utf-8');

    const fileBuffer = fs.readFileSync(tmpPath);
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: 'text/plain' });
    formData.append('files', blob, 'yatrasarthi_corpus.txt');

    const uploadRes = await fetch(`${NUGEN_BASE}/api/v3/documents/create`, {
      method: 'POST',
      headers: authHeader,
      body: formData,
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      console.error('[nugen/align] Upload failed:', uploadRes.status, err);
      return NextResponse.json({ error: 'Document upload failed', detail: err }, { status: 500 });
    }

    const uploadData = await uploadRes.json();
    console.log('[nugen/align] Upload response:', JSON.stringify(uploadData));

    const documentIds: string[] = uploadData.document_ids ?? [];
    if (documentIds.length === 0) {
      return NextResponse.json({ error: 'No document IDs returned', detail: uploadData }, { status: 500 });
    }
    const documentId = documentIds[0];
    console.log('[nugen/align] Document ID:', documentId);

    // Step 2: Create alignment project
    console.log('[nugen/align] Creating alignment project…');
    const alignRes = await fetch(`${NUGEN_BASE}/api/v3/alignment-projects/create`, {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alignment_name: 'YatraSarthi Policy & Recovery Alignment',
        base_model_id: 'qwen-v2p5-0p5b-instruct',
        document_ids: documentIds,
        description: 'Aligned on DGCA passenger rights, IRCTC refund policies, hotel cancellation, YatraSarthi recovery ranking, weather-impact Q&A.',
      }),
    });

    if (!alignRes.ok) {
      const err = await alignRes.text();
      console.error('[nugen/align] Alignment failed:', alignRes.status, err);
      return NextResponse.json({ error: 'Alignment creation failed', detail: err }, { status: 500 });
    }

    const alignData = await alignRes.json();
    const alignmentId = alignData.alignment_id ?? alignData.id;
    console.log('[nugen/align] Alignment started:', alignmentId);

    return NextResponse.json({
      alignment_id: alignmentId,
      document_id: documentId,
      status: 'PROCESSING',
      message: `Alignment job started. Poll /api/nugen/status?id=${alignmentId}`,
    });
  } catch (error) {
    console.error('[nugen/align] Error:', error);
    return NextResponse.json({ error: 'Internal error', detail: String(error) }, { status: 500 });
  }
}
