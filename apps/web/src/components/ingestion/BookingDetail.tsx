'use client';

import { useEffect, useState } from 'react';
import type { Node } from '@yatrasarthi/types';

interface BookingDetailProps {
  nodeId: string;
  onBack: () => void;
  onDeleted: () => void;
}

interface NodeWithNeighbours extends Node {
  prevNodeId?: string;
  nextNodeId?: string;
  bufferToPrevMin?: number;
  bufferToNextMin?: number;
}

export default function BookingDetail({ nodeId, onBack, onDeleted }: BookingDetailProps) {
  const [node, setNode] = useState<NodeWithNeighbours | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    fetch(`/api/nodes/${nodeId}`)
      .then(r => r.json())
      .then(j => setNode(j.data))
      .finally(() => setLoading(false));
  }, [nodeId]);

  const handleDelete = async () => {
    setDeleting(true);
    await fetch(`/api/nodes/${nodeId}`, { method: 'DELETE' });
    onDeleted();
  };

  if (loading) return <div style={styles.loading}>Loading…</div>;
  if (!node) return <div style={styles.loading}>Booking not found.</div>;

  const isCancelled = node.status === 'cancelled';
  const constraintLabel = node.constraintType === 'hard' ? 'Fixed time — cannot be moved' : 'Can wait, at a cost';

  const statusColors: Record<string, string> = {
    pending_review: '#f59e0b',
    on_track:       '#22c55e',
    at_risk:        '#f97316',
    broken:         '#ef4444',
    confirmed:      '#22c55e',
    cancelled:      '#64748b',
  };

  return (
    <div style={styles.container}>
      <button style={styles.back} onClick={onBack}>← Back</button>

      {/* Cancelled-booking banner (addendum §3.1) */}
      {isCancelled && (
        <div style={styles.cancelledBanner}>
          <span style={styles.cancelledIcon}>🚫</span>
          <div>
            <p style={styles.cancelledTitle}>This booking was cancelled</p>
            <p style={styles.cancelledBody}>
              {node.triggerSource === 'vendor_cancellation'
                ? 'The vendor cancelled this booking. Every downstream connection has been marked hard-broken — open a recovery plan to find an alternative.'
                : 'This booking is cancelled. Start a recovery plan to find an alternative.'}
            </p>
            <button
              style={styles.recoveryLink}
              onClick={() => {
                // Navigate to recovery options — Person 4's screen (E3).
                // We emit a custom event so the parent shell can route there.
                window.dispatchEvent(new CustomEvent('yatra:open-recovery', { detail: { nodeId } }));
              }}
            >
              View recovery options →
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.heading}>{node.label}</h2>
          <p style={styles.subheading}>{node.vendor ?? node.type}</p>
        </div>
        <span style={{
          ...styles.statusBadge,
          background: (statusColors[node.status] ?? '#94a3b8') + '20',
          color: statusColors[node.status] ?? '#94a3b8',
        }}>
          {node.status.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Timing */}
      <div style={styles.section}>
        <p style={styles.label}>Date &amp; time</p>
        <p style={styles.value}>
          {node.time
            ? (isNaN(new Date(node.time).getTime())
              ? String(node.time)
              : new Date(node.time).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }))
            : '—'}
        </p>
      </div>

      {/* Constraint — hide for cancelled nodes (irrelevant once cancelled) */}
      {!isCancelled && (
        <div style={styles.section}>
          <p style={styles.label}>Constraint</p>
          <p style={styles.value}>{constraintLabel}</p>
        </div>
      )}

      {/* Trigger source — shown only when set */}
      {node.triggerSource && (
        <div style={styles.section}>
          <p style={styles.label}>Disruption source</p>
          <p style={styles.value}>
            {node.triggerSource === 'vendor_cancellation' && 'Vendor cancellation'}
            {node.triggerSource === 'weather'              && 'Weather'}
            {node.triggerSource === 'delay'                && 'Delay'}
          </p>
        </div>
      )}

      {/* Position in trip */}
      {(node.prevNodeId || node.nextNodeId) && (
        <div style={styles.section}>
          <p style={styles.label}>Position in trip</p>
          {node.bufferToPrevMin !== undefined && (
            <p style={styles.bufferLine}>← {node.bufferToPrevMin} min buffer before this</p>
          )}
          {node.bufferToNextMin !== undefined && (
            <p style={styles.bufferLine}>{node.bufferToNextMin} min buffer after this →</p>
          )}
        </div>
      )}

      {/* Extracted fields */}
      <div style={styles.section}>
        <p style={styles.label}>Booking details</p>
        {Object.entries(node.rawExtract ?? {}).map(([k, v]) => (
          <div key={k} style={styles.fieldRow}>
            <span style={styles.fieldKey}>{k}</span>
            <span style={styles.fieldValue}>{String(v ?? '—')}</span>
          </div>
        ))}
      </div>

      {/* Refund policy */}
      {node.refundPolicy && (
        <div style={styles.section}>
          <p style={styles.label}>Cancellation policy</p>
          <p style={styles.value}>{node.refundPolicy.summary}</p>
          <p style={styles.policySource}>Source: {node.refundPolicy.source.replace(/_/g, ' ')}</p>
        </div>
      )}

      {/* Delete */}
      {!confirmDelete ? (
        <button style={styles.deleteBtn} onClick={() => setConfirmDelete(true)}>Remove from trip</button>
      ) : (
        <div style={styles.deleteConfirm}>
          <p style={styles.deleteWarning}>Remove this booking from the trip? This also removes its connections.</p>
          <div style={styles.deleteActions}>
            <button style={styles.cancelBtn} onClick={() => setConfirmDelete(false)}>Keep it</button>
            <button style={{ ...styles.confirmDeleteBtn, opacity: deleting ? 0.6 : 1 }} onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Removing…' : 'Yes, remove'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '20px', maxWidth: 480, margin: '0 auto', fontFamily: 'Inter, sans-serif' },
  loading: { padding: '40px', textAlign: 'center', color: '#94a3b8', fontFamily: 'Inter, sans-serif' },
  back: { background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 14, padding: 0, marginBottom: 16 },
  // Cancelled banner
  cancelledBanner: {
    display: 'flex', alignItems: 'flex-start', gap: 12,
    background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12,
    padding: '14px 16px', marginBottom: 20,
  },
  cancelledIcon: { fontSize: 22, flexShrink: 0 },
  cancelledTitle: { fontSize: 14, fontWeight: 700, color: '#7f1d1d', margin: '0 0 4px' },
  cancelledBody: { fontSize: 13, color: '#991b1b', margin: '0 0 10px', lineHeight: 1.5 },
  recoveryLink: {
    background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer',
    fontSize: 13, fontWeight: 700, padding: 0, textDecoration: 'underline',
  },
  // Header
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 },
  heading: { fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 },
  subheading: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  statusBadge: { fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' },
  section: { marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #f1f5f9' },
  label: { fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 },
  value: { fontSize: 15, color: '#0f172a', fontWeight: 500 },
  bufferLine: { fontSize: 13, color: '#64748b', margin: '4px 0' },
  fieldRow: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f8fafc' },
  fieldKey: { fontSize: 13, color: '#64748b', textTransform: 'capitalize' },
  fieldValue: { fontSize: 13, color: '#0f172a', fontWeight: 500 },
  policySource: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
  deleteBtn: { width: '100%', padding: '13px', background: '#fff', border: '1px solid #fecaca', color: '#ef4444', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 8 },
  deleteConfirm: { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '16px', marginTop: 8 },
  deleteWarning: { fontSize: 14, color: '#7f1d1d', marginBottom: 12 },
  deleteActions: { display: 'flex', gap: 10 },
  cancelBtn: { flex: 1, padding: '10px', background: '#f1f5f9', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#475569' },
  confirmDeleteBtn: { flex: 1, padding: '10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
};
