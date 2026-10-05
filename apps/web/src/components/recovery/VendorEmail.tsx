'use client';

import { useState } from 'react';
import { Loader2, Wand2, Send, Bell, XCircle, CheckCircle, Copy } from 'lucide-react';

interface VendorEmailProps {
  actionId: string;
  /** Optionally pre-populate from a persisted vendorDraft */
  initialDraft?: { subject: string; body: string; sentAt?: string; nudgedAt?: string[] };
  onSent?: () => void;
  onFailureReported?: () => void;
}

export function VendorEmail({ actionId, initialDraft, onSent, onFailureReported }: VendorEmailProps) {
  const [draft, setDraft] = useState<{ subject: string; body: string } | null>(initialDraft ?? null);
  const [generating, setGenerating] = useState(false);
  const [marking, setMarking] = useState(false);
  const [nudging, setNudging] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(!!initialDraft?.sentAt);
  const [nudgeCount, setNudgeCount] = useState(initialDraft?.nudgedAt?.length ?? 0);
  const [error, setError] = useState<string | null>(null);
  const [failureReason, setFailureReason] = useState('');
  const [showFailure, setShowFailure] = useState(false);
  const [lastNudgeAt, setLastNudgeAt] = useState<number | null>(null);

  const NUDGE_COOLDOWN_MS = 60_000; // 1-minute client-side cooldown

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/actions/${actionId}/draft-vendor-email`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? 'Generation failed');
      setDraft({ subject: data.data.subject, body: data.data.body });
    } catch (e: any) {
      setError(e.message ?? 'Failed to generate draft.');
    } finally {
      setGenerating(false);
    }
  };

  const handleMarkSent = async () => {
    if (!draft) return;
    setMarking(true);
    setError(null);
    try {
      const res = await fetch(`/api/actions/${actionId}/mark-sent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: draft.subject, body: draft.body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to mark sent');
      setSent(true);
      onSent?.();
    } catch (e: any) {
      setError(e.message ?? 'Failed to mark as sent.');
    } finally {
      setMarking(false);
    }
  };

  const handleNudge = async () => {
    if (lastNudgeAt && Date.now() - lastNudgeAt < NUDGE_COOLDOWN_MS) return;
    setNudging(true);
    setError(null);
    try {
      const res = await fetch(`/api/actions/${actionId}/nudge`, { method: 'POST' });
      if (!res.ok) throw new Error('Nudge failed');
      setNudgeCount((n) => n + 1);
      setLastNudgeAt(Date.now());
    } catch (e: any) {
      setError(e.message ?? 'Failed to send nudge.');
    } finally {
      setNudging(false);
    }
  };

  const handleReportFailure = async () => {
    setReporting(true);
    setError(null);
    try {
      const res = await fetch(`/api/actions/${actionId}/report-failure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: failureReason || undefined }),
      });
      if (!res.ok) throw new Error('Failed to report failure');
      onFailureReported?.();
    } catch (e: any) {
      setError(e.message ?? 'Failed to report failure.');
    } finally {
      setReporting(false);
      setShowFailure(false);
    }
  };

  const handleCopy = () => {
    if (!draft) return;
    navigator.clipboard?.writeText(`Subject: ${draft.subject}\n\n${draft.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const nudgeCooldownActive = lastNudgeAt ? Date.now() - lastNudgeAt < NUDGE_COOLDOWN_MS : false;

  return (
    <div className="card p-6 bg-white border" style={{ borderColor: '#D5D9CC' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-base" style={{ color: '#172017' }}>Vendor Communication</h3>
        {sent ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: '#DCE8D2', color: '#2E7D32' }}>
            <CheckCircle size={11} /> Email sent
          </span>
        ) : (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full border" style={{ background: '#FDF2E0', color: '#9A5A00', borderColor: '#EFD090' }}>
            ⏱ Pending
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: '#FDECEA', color: '#B03028' }}>
          {error}
        </div>
      )}

      {!draft && !sent && (
        <div className="text-center py-8">
          <p className="text-sm mb-4" style={{ color: '#5F665B' }}>
            Generate an AI-drafted vendor email to request rescheduling or a refund.
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm mx-auto"
          >
            {generating ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
            {generating ? 'Generating…' : 'Generate draft'}
          </button>
        </div>
      )}

      {draft && (
        <>
          <div className="flex flex-col gap-2 mb-4">
            <div className="flex gap-3 text-xs">
              <span style={{ color: '#5F665B', minWidth: 52 }}>Subject:</span>
              <input
                className="flex-1 font-semibold text-xs bg-transparent border-b pb-0.5 outline-none"
                style={{ color: '#172017', borderColor: '#D5D9CC' }}
                value={draft.subject}
                onChange={(e) => setDraft((d) => d ? { ...d, subject: e.target.value } : d)}
                disabled={sent}
              />
            </div>
          </div>

          <textarea
            value={draft.body}
            onChange={(e) => setDraft((d) => d ? { ...d, body: e.target.value } : d)}
            disabled={sent}
            rows={8}
            className="w-full rounded-xl p-4 text-xs leading-relaxed resize-none mb-4 border"
            style={{
              background: '#F5F2E8',
              color: '#172017',
              borderColor: '#D5D9CC',
              fontFamily: 'monospace',
            }}
          />

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleCopy}
              className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm"
            >
              {copied ? <CheckCircle size={13} style={{ color: '#2E7D32' }} /> : <Copy size={13} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>

            {!sent && (
              <button
                onClick={handleMarkSent}
                disabled={marking}
                className="btn-primary flex items-center gap-2 px-4 py-2 text-sm ml-auto"
              >
                {marking ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                {marking ? 'Saving…' : 'Mark as sent'}
              </button>
            )}
          </div>
        </>
      )}

      {/* Post-send actions */}
      {sent && (
        <div className="mt-4 flex flex-col gap-3">
          <div className="p-3 rounded-xl border text-sm" style={{ background: '#F5F2E8', borderColor: '#D5D9CC', color: '#5F665B' }}>
            Nudge count: <strong style={{ color: '#172017' }}>{nudgeCount}</strong>
            {nudgeCount === 0 && ' · No nudges sent yet'}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleNudge}
              disabled={nudging || nudgeCooldownActive}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border"
              style={{
                background: nudgeCooldownActive ? '#F5F2E8' : '#EDE9D8',
                color: nudgeCooldownActive ? '#9CA3AF' : '#172017',
                borderColor: '#D5D9CC',
              }}
            >
              {nudging ? <Loader2 size={13} className="animate-spin" /> : <Bell size={13} />}
              {nudging ? 'Nudging…' : nudgeCooldownActive ? 'Cooldown…' : 'Nudge vendor'}
            </button>

            <button
              onClick={() => setShowFailure(!showFailure)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border"
              style={{ background: '#FDECEA', color: '#B03028', borderColor: '#EFAAA5' }}
            >
              <XCircle size={13} />
              Report failure
            </button>
          </div>

          {showFailure && (
            <div className="flex flex-col gap-2">
              <textarea
                value={failureReason}
                onChange={(e) => setFailureReason(e.target.value)}
                placeholder="Optional: describe what went wrong…"
                rows={3}
                className="w-full rounded-xl p-3 text-sm resize-none border"
                style={{ borderColor: '#EFAAA5', background: '#FEF9F8', color: '#172017' }}
              />
              <button
                onClick={handleReportFailure}
                disabled={reporting}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: '#B03028', color: '#FFFFFF' }}
              >
                {reporting ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
                {reporting ? 'Reporting…' : 'Confirm failure'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
