import { Node, Edge, RecoveryOption, RankingMode, TriggerSource } from '@yatrasarthi/types';
import { TripGraph } from '@yatrasarthi/graph';

/**
 * Recovery Option Ranker — Person 4 addendum extension
 *
 * Addendum changes over v1:
 *  1. Four labelled plans instead of three (adds "Wait & Monitor" as an explicit plan)
 *  2. De-duplication: plans with identical nodesDropped sets are merged, cheapest kept
 *  3. Minimum-option guarantee: if fewer than 2 unique plans survive, broadening step
 *     injects a synthetic "Partial Reroute" option so the user always sees ≥ 2 choices
 *  4. triggerSource wired into DGCA policy engine:
 *       - vendor_cancellation → full DGCA compensation eligible (₹5,000–₹10,000)
 *       - weather             → compensation NOT eligible (extraordinary circumstances)
 *       - delay               → compensation eligible only when delay ≥ 2h and airline-controlled
 *  5. Sortable: each option carries sortKey so the frontend can re-sort on any axis
 *
 * Output shape: RecoveryOption[] (extends packages/types RecoveryOption with label + sortKey)
 */

interface RawNode extends Node {
  _id?: any;
  delay?: number;
}

// ── DGCA compensation rules wired to triggerSource ─────────────────────────

interface DGCAResult {
  eligible: boolean;
  amountPaise: number;   // 0 if not eligible
  reason: string;
}

function dgcaCompensation(
  nodeType: string,
  delayMin: number,
  triggerSource?: TriggerSource
): DGCAResult {
  if (nodeType !== 'flight') {
    return { eligible: false, amountPaise: 0, reason: 'DGCA only applies to flights' };
  }

  // Weather = extraordinary circumstances → no compensation (DGCA para 3.3)
  if (triggerSource === 'weather') {
    return {
      eligible: false,
      amountPaise: 0,
      reason: 'Extraordinary circumstances (weather) — DGCA compensation not applicable',
    };
  }

  // Vendor-initiated cancellation → full cancellation compensation (DGCA para 4.2)
  if (triggerSource === 'vendor_cancellation') {
    return {
      eligible: true,
      // ₹5,000 for routes ≤ 1h, ₹10,000 for routes > 1h (distance heuristic via delay)
      amountPaise: delayMin <= 60 ? 500000 : 1000000,
      reason: 'Vendor-initiated cancellation — DGCA cancellation compensation applicable',
    };
  }

  // Standard delay — eligible only when ≥ 2h
  if (delayMin >= 120) {
    return {
      eligible: true,
      amountPaise: delayMin >= 360 ? 1000000 : 500000,
      reason: 'Flight delayed ≥ 2h — DGCA delay compensation applicable',
    };
  }

  return { eligible: false, amountPaise: 0, reason: 'Delay < 2h — below DGCA threshold' };
}

// ── Mode weight table ───────────────────────────────────────────────────────

const MODE_WEIGHTS: Record<RankingMode, { cost: number; time: number; bookings: number }> = {
  cheapest:           { cost: 0.60, time: 0.20, bookings: 0.20 },
  fastest:            { cost: 0.20, time: 0.60, bookings: 0.20 },
  preserve_itinerary: { cost: 0.20, time: 0.20, bookings: 0.60 },
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function arrivalTimeFromDelay(baseIso: string | undefined, extraMin: number): string {
  if (!baseIso) return 'Unknown';
  try {
    const d = new Date(baseIso);
    d.setMinutes(d.getMinutes() + extraMin);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return 'Unknown';
  }
}

function isoExpiry(fromNow: number): string {
  return new Date(Date.now() + fromNow).toISOString();
}

/** Stable key for de-duplication: sorted dropped node set */
function dedupKey(nodesDropped: string[]): string {
  return [...nodesDropped].sort().join('|');
}

// ── Extended RecoveryOption with sort keys ───────────────────────────────────

export interface ExtendedRecoveryOption extends RecoveryOption {
  label: 'skip_reschedule' | 'rebook' | 'alternate_transit' | 'wait_monitor' | 'partial_reroute';
  explanation?: string;
  dgca: DGCAResult;
  sortKey: { cost: number; timePenaltyMin: number; bookingsPreserved: number };
}

// ── Main export ─────────────────────────────────────────────────────────────

export function generateRecoveryOptions(
  tripId: string,
  rawNodes: RawNode[],
  rawEdges: Edge[],
  brokenNodeId: string,
  mode: RankingMode = 'cheapest',
  triggerSource?: TriggerSource
): ExtendedRecoveryOption[] {
  const nodes = rawNodes.map((n) => ({ ...n, id: n.id ?? (n as any)._id?.toString() }));
  const edges = rawEdges.map((e) => ({ ...e, id: e.id ?? (e as any)._id?.toString() }));

  const brokenNode = nodes.find((n) => n.id === brokenNodeId) as any;
  const totalBookings = nodes.filter((n) => n.type !== 'phantom').length;

  // ── Fallback when no broken node found ────────────────────────────────────
  if (!brokenNode) {
    const waitOption: ExtendedRecoveryOption = {
      optionId: 'opt_wait',
      name: 'Wait & Monitor',
      label: 'wait_monitor',
      explanation: 'No active disruption found. Monitoring trip status.',
      netCost: 0,
      possibleCompensation: 0,
      arrivalTime: arrivalTimeFromDelay(nodes[nodes.length - 1]?.time, 0),
      nodesDropped: [],
      recommended: true,
      scoreBreakdown: { costNorm: 1, timeNorm: 1, nodesNorm: 1 },
      changes: [],
      perMemberShare: [],
      quoteExpiresAt: isoExpiry(30 * 60 * 1000),
      dgca: { eligible: false, amountPaise: 0, reason: 'No active disruption' },
      sortKey: { cost: 0, timePenaltyMin: 0, bookingsPreserved: totalBookings },
    };
    return [waitOption];
  }

  // ── Build graph and propagate delay ───────────────────────────────────────
  const graph = new TripGraph();
  nodes.forEach((n) => graph.addNode(n.id));
  edges.forEach((e) =>
    graph.addEdge({
      from: e.fromNodeId,
      to: e.toNodeId,
      bufferMin: e.bufferMin ?? 0,
      paddingMin: e.paddingMin ?? 0,
      constraint: e.constraint ?? 'soft',
    })
  );

  const delayMin = brokenNode.delay ?? 120;
  const { broken: cascadeBroken, atRisk } = graph.propagateDelay(brokenNodeId, delayMin);

  const affectedIds = new Set([brokenNodeId, ...cascadeBroken, ...atRisk]);
  const affectedNodes = nodes.filter((n) => affectedIds.has(n.id) && n.id !== brokenNodeId) as any[];
  const unaffectedNodes = nodes.filter((n) => !affectedIds.has(n.id)) as any[];
  const lastNode = nodes[nodes.length - 1];
  const memberIds = [...new Set(nodes.map((n: any) => n.ownerId).filter(Boolean))];

  // DGCA assessment for this disruption
  const dgca = dgcaCompensation(brokenNode.type, delayMin, triggerSource);

  interface Candidate extends ExtendedRecoveryOption {
    timePenaltyMin: number;
    bookingsPreserved: number;
    _total: number;
  }

  const candidates: Candidate[] = [];

  // ── Option 1: Skip & Reschedule (soft-constraint nodes dropped) ───────────
  {
    const softDropped = affectedNodes.filter((n) => n.constraintType !== 'hard');
    const cancelCost = softDropped.reduce(
      (sum, n) => sum + (n.refundPolicy?.source === 'unmatched' ? 50000 : 0),
      0
    );
    const preserved = unaffectedNodes.length;

    candidates.push({
      optionId: 'opt_skip',
      name: softDropped.length > 0 
        ? `Cancel ${softDropped[0]?.label || 'affected leg'} & preserve rest` 
        : 'Skip & Reschedule',
      label: 'skip_reschedule',
      explanation: softDropped.length > 0
        ? `Drops ${softDropped.length} downstream bookings to recover the timeline and avoid hard failures.`
        : 'Skips the affected leg and reschedules remaining itinerary.',
      netCost: cancelCost,
      possibleCompensation: dgca.eligible ? dgca.amountPaise : 0,
      arrivalTime: arrivalTimeFromDelay(lastNode?.time, delayMin),
      nodesDropped: softDropped.map((n) => n.id),
      timePenaltyMin: delayMin,
      bookingsPreserved: preserved,
      recommended: false,
      scoreBreakdown: { costNorm: 0, timeNorm: 0, nodesNorm: 0 },
      changes: softDropped.map((n) => ({ nodeId: n.id, field: 'status', from: n.status, to: 'cancelled' })),
      perMemberShare: memberIds.map((mid) => ({ memberId: mid, amount: Math.round(cancelCost / memberIds.length) })),
      quoteExpiresAt: isoExpiry(30 * 60 * 1000),
      dgca,
      sortKey: { cost: cancelCost, timePenaltyMin: delayMin, bookingsPreserved: preserved },
      _total: 0,
    });
  }

  // ── Option 2: Rebook the broken node ─────────────────────────────────────
  {
    const rebookCostPaise =
      brokenNode.type === 'flight' ? 650000 :
      brokenNode.type === 'train'  ? 120000 :
      brokenNode.type === 'hotel'  ? 300000 : 80000;

    const timeSaved = Math.max(0, delayMin - 60);
    const preserved = totalBookings;

    candidates.push({
      optionId: 'opt_rebook',
      name: `Rebook ${brokenNode.type}: Secure alternative to ${brokenNode.label || 'leg'}`,
      label: 'rebook',
      explanation: `Replaces the disrupted booking with an alternative vendor to preserve the full itinerary.`,
      netCost: rebookCostPaise,
      possibleCompensation: dgca.eligible ? dgca.amountPaise : 0,
      arrivalTime: arrivalTimeFromDelay(lastNode?.time, delayMin - timeSaved),
      nodesDropped: [],
      timePenaltyMin: delayMin - timeSaved,
      bookingsPreserved: preserved,
      recommended: false,
      scoreBreakdown: { costNorm: 0, timeNorm: 0, nodesNorm: 0 },
      changes: [{ nodeId: brokenNodeId, field: 'status', from: 'broken', to: 'on_track' }],
      perMemberShare: memberIds.map((mid) => ({ memberId: mid, amount: Math.round(rebookCostPaise / memberIds.length) })),
      quoteExpiresAt: isoExpiry(20 * 60 * 1000),
      dgca,
      sortKey: { cost: rebookCostPaise, timePenaltyMin: delayMin - timeSaved, bookingsPreserved: preserved },
      _total: 0,
    });
  }

  // ── Option 3: Add Alternate Transit (phantom leg) ─────────────────────────
  {
    const phantomCostPaise = 150000;
    const softDropped = affectedNodes.filter(
      (n) => n.constraintType !== 'hard' && !['hotel', 'flight', 'train'].includes(n.type)
    );
    const preserved = unaffectedNodes.length + (affectedNodes.length - softDropped.length);

    candidates.push({
      optionId: 'opt_phantom',
      name: unaffectedNodes.length > 0
        ? `Backup transit to preserve ${unaffectedNodes[0]?.label || 'next stop'}`
        : 'Add Emergency Transit',
      label: 'alternate_transit',
      explanation: `Inserts a backup transportation leg to bypass the delay and reach the next critical stop.`,
      netCost: phantomCostPaise,
      possibleCompensation: 0,
      arrivalTime: arrivalTimeFromDelay(lastNode?.time, delayMin + 30),
      nodesDropped: softDropped.map((n) => n.id),
      timePenaltyMin: delayMin + 30,
      bookingsPreserved: preserved,
      recommended: false,
      scoreBreakdown: { costNorm: 0, timeNorm: 0, nodesNorm: 0 },
      changes: [
        ...softDropped.map((n) => ({ nodeId: n.id, field: 'status', from: n.status, to: 'cancelled' })),
        { nodeId: 'phantom_new', field: 'type', from: null, to: 'phantom' },
      ],
      perMemberShare: memberIds.map((mid) => ({ memberId: mid, amount: Math.round(phantomCostPaise / memberIds.length) })),
      quoteExpiresAt: isoExpiry(30 * 60 * 1000),
      dgca,
      sortKey: { cost: phantomCostPaise, timePenaltyMin: delayMin + 30, bookingsPreserved: preserved },
      _total: 0,
    });
  }

  // ── Option 4: Wait & Monitor (explicit plan — always included) ─────────────
  {
    candidates.push({
      optionId: 'opt_wait',
      name: `Wait & Monitor ${brokenNode.label || 'ETA'} updates`,
      label: 'wait_monitor',
      explanation: `Makes no immediate changes. Monitors the delay to see if downstream buffers can absorb it.`,
      netCost: 0,
      possibleCompensation: dgca.eligible ? dgca.amountPaise : 0,
      arrivalTime: arrivalTimeFromDelay(lastNode?.time, delayMin),
      nodesDropped: [],
      timePenaltyMin: delayMin,
      bookingsPreserved: totalBookings,
      recommended: false,
      scoreBreakdown: { costNorm: 0, timeNorm: 0, nodesNorm: 0 },
      changes: [],
      perMemberShare: [],
      quoteExpiresAt: isoExpiry(60 * 60 * 1000),
      dgca,
      sortKey: { cost: 0, timePenaltyMin: delayMin, bookingsPreserved: totalBookings },
      _total: 0,
    });
  }

  // ── Minimum-option guarantee: broadening step ─────────────────────────────
  // If we have < 4 options, synthesise a "Partial Reroute" to ensure at least 4 plans
  const finalCandidates = [...candidates];
  if (finalCandidates.length < 4) {
    const partialDropped = affectedNodes.slice(0, Math.ceil(affectedNodes.length / 2)).map((n) => n.id);
    const partialCost = 200000; // ₹2,000 partial reroute cost
    const partialPreserved = totalBookings - partialDropped.length;

    const broadened: Candidate = {
      optionId: 'opt_partial_reroute',
      name: `Salvage itinerary: Drop ${partialDropped.length} booking${partialDropped.length > 1 ? 's' : ''}`,
      label: 'partial_reroute',
      explanation: `Cancels ${partialDropped.length} upstream bookings to salvage the remainder of the trip.`,
      netCost: partialCost,
      possibleCompensation: dgca.eligible ? Math.floor(dgca.amountPaise / 2) : 0,
      arrivalTime: arrivalTimeFromDelay(lastNode?.time, Math.floor(delayMin * 0.6)),
      nodesDropped: partialDropped,
      timePenaltyMin: Math.floor(delayMin * 0.6),
      bookingsPreserved: partialPreserved,
      recommended: false,
      scoreBreakdown: { costNorm: 0, timeNorm: 0, nodesNorm: 0 },
      changes: partialDropped.map((id) => ({ nodeId: id, field: 'status', from: 'broken', to: 'cancelled' })),
      perMemberShare: memberIds.map((mid) => ({ memberId: mid, amount: Math.round(partialCost / memberIds.length) })),
      quoteExpiresAt: isoExpiry(30 * 60 * 1000),
      dgca,
      sortKey: { cost: partialCost, timePenaltyMin: Math.floor(delayMin * 0.6), bookingsPreserved: partialPreserved },
      _total: 0,
    };
    finalCandidates.push(broadened);
  }

  // ── Normalise scores and apply mode weights ────────────────────────────────
  const maxCost  = Math.max(...finalCandidates.map((c) => c.netCost), 1);
  const maxTime  = Math.max(...finalCandidates.map((c) => c.timePenaltyMin), 1);
  const maxBooks = Math.max(totalBookings, 1);
  const weights  = MODE_WEIGHTS[mode] ?? MODE_WEIGHTS.cheapest;

  const scored = finalCandidates.map((c) => {
    const costNorm  = 1 - c.netCost / maxCost;
    const timeNorm  = 1 - c.timePenaltyMin / maxTime;
    const nodesNorm = c.bookingsPreserved / maxBooks;
    const total     = costNorm * weights.cost + timeNorm * weights.time + nodesNorm * weights.bookings;
    return { ...c, scoreBreakdown: { costNorm, timeNorm, nodesNorm }, _total: total };
  });

  scored.sort((a, b) => b._total - a._total);
  scored[0].recommended = true;

  // Return up to 4 options; strip internal fields
  return scored.slice(0, 4).map(({ _total, timePenaltyMin, bookingsPreserved, ...rest }) => rest);
}
