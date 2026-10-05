'use client';

import { useState } from 'react';
import type { Node } from '@yatrasarthi/types';

interface ExtractionReviewProps {
  node: Node & { triggerSource?: 'vendor_cancellation' | 'delay' | 'weather' };
  onConfirmed: () => void;
  onBack: () => void;
  onPhantom: () => void;
}

const NODE_TYPES = ['flight', 'train', 'bus', 'cab', 'hotel', 'phantom'] as const;

export default function ExtractionReview({ node, onConfirmed, onBack, onPhantom }: ExtractionReviewProps) {
  const [fields, setFields] = useState<Record<string, unknown>>(node.rawExtract ?? {});
  const [refundTier, setRefundTier] = useState('');
  const [nodeType, setNodeType] = useState(node.type);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const hasLowConfidence = (key: string) => {
    const score = node.confidence?.[key];
    return score !== undefined && score < 0.7;
  };

  const isCancellation = node.triggerSource === 'vendor_cancellation';

  const handleConfirm = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/nodes/${node.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: { ...fields, type: nodeType },
          refundTier: refundTier || undefined,
          // Forward triggerSource so the confirm route can set status=cancelled
          triggerSource: node.triggerSource,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        setError(json.error?.message ?? 'Failed to confirm booking.');
        return;
      }

      onConfirmed();
    } catch {
      setError('Failed to confirm booking.');
    } finally {
      setLoading(false);
    }
  };

  const hasPolicy = !!node.refundPolicy && node.refundPolicy.source !== 'unmatched';

  return (
    <div style={styles.container}>
      <button style={styles.back} onClick={onBack}>← Back</button>
      <h2 style={styles.heading}>Confirm what we found</h2>

      {/* Cancellation / delay disruption alert banner */}
      {isCancellation && (
        <div style={styles.cancellationBanner}>
          <span style={styles.cancellationIcon}>🚫</span>
          <div>
            <p style={styles.cancellationTitle}>This booking looks cancelled</p>
            <p style={styles.cancellationBody}>
              We detected a cancellation notice. We&apos;ll mark it as cancelled when you add it —
              the trip timeline will show it and you can start a recovery plan from there.
            </p>
          </div>
        </div>
      )}

      {node.triggerSource === 'delay' && (
        <div style={styles.delayBanner}>
          <span style={styles.delayIcon}>⚠️</span>
          <div>
            <p style={styles.delayTitle}>Delay detected</p>
            <p style={styles.delayBody}>
              This message mentions a delay. We&apos;ll add it normally — you can report the delay
              separately from the trip timeline to trigger the cascade check.
            </p>
          </div>
        </div>
      )}

      {/* Booking type */}
      <div style={styles.section}>
        <p style={styles.label}>Booking type</p>
        <select
          style={styles.select}
          value={nodeType}
          onChange={e => setNodeType(e.target.value as Node['type'])}
        >
          {NODE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
      </div>

      {/* Extracted fields */}
      <div style={styles.section}>
        <p style={styles.label}>Extracted details</p>
        {Object.entries(fields).map(([key, value]) => (
          <div key={key} style={styles.fieldRow}>
            <div style={styles.fieldLeft}>
              <span style={styles.fieldKey}>{key}</span>
              {hasLowConfidence(key) && (
                <span style={styles.checkFlag}>⚠ Check this — we&apos;re not fully sure we read it correctly.</span>
              )}
            </div>
            <input
              style={{ ...styles.fieldInput, borderColor: hasLowConfidence(key) ? '#f59e0b' : '#e2e8f0' }}
              value={String(value ?? '')}
              onChange={e => setFields(prev => ({ ...prev, [key]: e.target.value }))}
            />
          </div>
        ))}
      </div>

      {/* Refund / cancellation policy */}
      <div style={styles.section}>
        <p style={styles.label}>Cancellation policy</p>
        {hasPolicy ? (
          <div style={styles.policyMatched}>
            <span style={styles.policyCheck}>✓</span>
            <span>{node.refundPolicy!.summary}</span>
          </div>
        ) : (
          <div style={styles.policyUnmatched}>
            <p style={styles.policyQuestion}>We couldn&apos;t confirm this vendor&apos;s cancellation policy. Do you know it?</p>
            <input
              style={styles.fieldInput}
              placeholder="e.g. Free cancellation up to 24h before"
              value={refundTier}
              onChange={e => setRefundTier(e.target.value)}
            />
            <button style={styles.skipLink} onClick={() => setRefundTier('')}>Skip for now</button>
          </div>
        )}
      </div>

      {error && <p style={styles.error}>{error}</p>}

      <div style={styles.actions}>
        <button style={styles.cancelBtn} onClick={onBack} disabled={loading}>Cancel</button>
        <button
          style={{ ...styles.confirmBtn, opacity: loading ? 0.6 : 1 }}
          onClick={handleConfirm}
          disabled={loading}
        >
          {loading ? 'Adding…' : isCancellation ? 'Add as cancelled' : 'Looks right, add it'}
        </button>
      </div>

      <button style={styles.phantomLink} onClick={onPhantom}>Can&apos;t find it? Add as a manual leg instead</button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '20px', maxWidth: 480, margin: '0 auto', fontFamily: 'Inter, sans-serif' },
  back: { background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 14, padding: 0, marginBottom: 16 },
  heading: { fontSize: 22, fontWeight: 700, color: '#0f172a', marginBottom: 24 },
  // Cancellation banner
  cancellationBanner: {
    display: 'flex', alignItems: 'flex-start', gap: 12,
    background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12,
    padding: '14px 16px', marginBottom: 20,
  },
  cancellationIcon: { fontSize: 20, flexShrink: 0 },
  cancellationTitle: { fontSize: 14, fontWeight: 700, color: '#7f1d1d', margin: '0 0 4px' },
  cancellationBody: { fontSize: 13, color: '#991b1b', margin: 0, lineHeight: 1.5 },
  // Delay banner
  delayBanner: {
    display: 'flex', alignItems: 'flex-start', gap: 12,
    background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12,
    padding: '14px 16px', marginBottom: 20,
  },
  delayIcon: { fontSize: 20, flexShrink: 0 },
  delayTitle: { fontSize: 14, fontWeight: 700, color: '#92400e', margin: '0 0 4px' },
  delayBody: { fontSize: 13, color: '#78350f', margin: 0, lineHeight: 1.5 },
  // Existing styles
  section: { marginBottom: 24 },
  label: { fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 },
  select: { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, color: '#0f172a', background: '#fff' },
  fieldRow: { display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 },
  fieldLeft: { display: 'flex', flexDirection: 'column', gap: 2 },
  fieldKey: { fontSize: 13, fontWeight: 600, color: '#475569', textTransform: 'capitalize' },
  checkFlag: { fontSize: 11, color: '#f59e0b', fontWeight: 500 },
  fieldInput: { padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, color: '#0f172a', background: '#fff' },
  policyMatched: { display: 'flex', alignItems: 'center', gap: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px', fontSize: 14, color: '#166534' },
  policyCheck: { fontSize: 16, color: '#22c55e' },
  policyUnmatched: { background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 },
  policyQuestion: { fontSize: 14, color: '#92400e', margin: 0 },
  skipLink: { background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 13, padding: 0, alignSelf: 'flex-start', fontWeight: 600 },
  error: { color: '#ef4444', fontSize: 14, marginBottom: 12 },
  actions: { display: 'flex', gap: 12, marginBottom: 16 },
  cancelBtn: { flex: 1, padding: '13px', background: '#f1f5f9', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#475569' },
  confirmBtn: { flex: 2, padding: '13px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  phantomLink: { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 13, padding: 0 },
};
