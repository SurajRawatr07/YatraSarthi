import { NextResponse } from 'next/server';

// GET /api/policy-library — read-only view of the versioned refund/cancellation rules (I4)
// Query: ?vendor=&fareClass= (optional — omit for full list)
// Returns: { data: { rules: PolicyRule[] } }
//
// This is the same rule table the policy engine reads from when matching nodes.
// v1: static in-memory rules. Production: replace with a DB-backed versioned collection.

interface PolicyRule {
  ruleId: string;
  vendor: string;
  fareClass?: string;
  text: string;
  sourceUrl: string;
  effectiveFrom: string;
}

const POLICY_RULES: PolicyRule[] = [
  // DGCA — applies to all domestic airline passengers
  {
    ruleId: 'dgca-delay-2h',
    vendor: 'DGCA',
    text: 'If your flight is delayed by 2+ hours, you are entitled to meals and refreshments at the airport at the airline\'s cost.',
    sourceUrl: 'https://www.dgca.gov.in/digigov-files/pdf/airpassengercharter.pdf',
    effectiveFrom: '2023-01-01',
  },
  {
    ruleId: 'dgca-delay-6h',
    vendor: 'DGCA',
    text: 'If your flight is delayed by 6+ hours and you choose not to travel, you are entitled to a full refund.',
    sourceUrl: 'https://www.dgca.gov.in/digigov-files/pdf/airpassengercharter.pdf',
    effectiveFrom: '2023-01-01',
  },
  {
    ruleId: 'dgca-cancellation-comp',
    vendor: 'DGCA',
    text: 'If your flight is cancelled with less than 2 weeks\' notice, you may be entitled to compensation of ₹5,000–₹10,000 depending on flight distance, in addition to a full refund or rerouting.',
    sourceUrl: 'https://www.dgca.gov.in/digigov-files/pdf/airpassengercharter.pdf',
    effectiveFrom: '2023-01-01',
  },
  // IndiGo
  {
    ruleId: 'indigo-flexi-cancel',
    vendor: 'IndiGo',
    fareClass: 'Flexi',
    text: 'IndiGo Flexi fares: free cancellation up to 24 hours before departure. Refund credited within 7 business days.',
    sourceUrl: 'https://www.goindigo.in/information/cancellation-policy.html',
    effectiveFrom: '2024-01-01',
  },
  {
    ruleId: 'indigo-saver-cancel',
    vendor: 'IndiGo',
    fareClass: 'Saver',
    text: 'IndiGo Saver fares: cancellation fee of ₹3,000 per passenger per sector applies. No refund within 4 hours of departure.',
    sourceUrl: 'https://www.goindigo.in/information/cancellation-policy.html',
    effectiveFrom: '2024-01-01',
  },
  // Air India
  {
    ruleId: 'airindia-flexi-cancel',
    vendor: 'Air India',
    fareClass: 'Flexi',
    text: 'Air India Flexi: full refund if cancelled more than 24 hours before departure.',
    sourceUrl: 'https://www.airindia.com/in/en/manage/cancellation.html',
    effectiveFrom: '2024-06-01',
  },
  // IRCTC / Indian Railways
  {
    ruleId: 'irctc-cancel-48h',
    vendor: 'IRCTC',
    text: 'Cancellation more than 48 hours before departure: clerkage charge only (₹60–240 depending on class).',
    sourceUrl: 'https://www.irctc.co.in/nget/refund-rules',
    effectiveFrom: '2023-01-01',
  },
  {
    ruleId: 'irctc-cancel-12h',
    vendor: 'IRCTC',
    text: 'Cancellation between 12–48 hours before departure: 25% of base fare deducted.',
    sourceUrl: 'https://www.irctc.co.in/nget/refund-rules',
    effectiveFrom: '2023-01-01',
  },
  {
    ruleId: 'irctc-cancel-4h',
    vendor: 'IRCTC',
    text: 'Cancellation 4–12 hours before departure: 50% of base fare deducted.',
    sourceUrl: 'https://www.irctc.co.in/nget/refund-rules',
    effectiveFrom: '2023-01-01',
  },
  // Generic hotel
  {
    ruleId: 'hotel-free-cancel-48h',
    vendor: 'Generic Hotel',
    text: 'Standard hotel free cancellation window: 48 hours before check-in. No-show charged one night\'s rate.',
    sourceUrl: '',
    effectiveFrom: '2023-01-01',
  },
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const vendorFilter = searchParams.get('vendor')?.toLowerCase();
    const fareClassFilter = searchParams.get('fareClass')?.toLowerCase();

    let rules = POLICY_RULES;

    if (vendorFilter) {
      rules = rules.filter(r => r.vendor.toLowerCase().includes(vendorFilter));
    }
    if (fareClassFilter) {
      rules = rules.filter(r => !r.fareClass || r.fareClass.toLowerCase() === fareClassFilter);
    }

    return NextResponse.json({ data: { rules } });
  } catch (err) {
    console.error('policy-library GET error', err);
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to fetch policy library' } }, { status: 500 });
  }
}
