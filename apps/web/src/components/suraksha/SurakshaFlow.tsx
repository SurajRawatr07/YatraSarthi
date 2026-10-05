'use client';

import { useState, useEffect } from 'react';
import type { EmergencyContact } from '@yatrasarthi/types';

// H1–H3: SOS screen, 5-second countdown undo window, sent confirmation
// H4: Emergency contacts setup
// Rendered as an integrated flow, selectable via the `view` prop

type SurakshaView = 'sos' | 'countdown' | 'sent' | 'contacts';

interface SurakshaFlowProps {
  tripId: string;
  lastNodeId?: string;
  nextNodeId?: string;
  onClose?: () => void;
}

export default function SurakshaFlow({ tripId, lastNodeId, nextNodeId, onClose }: SurakshaFlowProps) {
  const [view, setView] = useState<SurakshaView>('sos');
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [sentResult, setSentResult] = useState<{ sentTo: EmergencyContact[]; localNumbers: { national: string; police: string; state: string } } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(5);

  // Fetch emergency contacts on mount
  useEffect(() => {
    fetch('/api/users/me/emergency-contacts')
      .then(r => r.json())
      .then(j => setContacts(j.data?.contacts ?? []))
      .catch(() => {});
  }, []);

  // Countdown timer when view === 'countdown'
  useEffect(() => {
    if (view !== 'countdown') return;
    setCountdown(5);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          triggerSOS();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const triggerSOS = async () => {
    setLoading(true);
    setError('');
    try {
      // Get GPS from browser
      const gps = await new Promise<{ lat: number; lng: number }>((resolve) => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => resolve({ lat: 0, lng: 0 })
          );
        } else {
          resolve({ lat: 0, lng: 0 });
        }
      });

      const res = await fetch('/api/suraksha/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId, lastNodeId, nextNodeId, gps }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message ?? 'Failed to send SOS');
        setView('sos');
        return;
      }

      setSentResult(json.data);
      setView('sent');
    } catch {
      setError('Failed to send SOS. Please call 112 directly.');
      setView('sos');
    } finally {
      setLoading(false);
    }
  };

  // H1 — SOS screen
  if (view === 'sos') {
    return (
      <div style={s.container}>
        <div style={s.header}>
          <button style={s.backBtn} onClick={onClose}>← Back</button>
          <button style={s.contactsBtn} onClick={() => setView('contacts')}>
            {contacts.length === 0 ? '+ Add contacts' : `${contacts.length} contact${contacts.length > 1 ? 's' : ''}`}
          </button>
        </div>

        <div style={s.sosCenter}>
          <p style={s.explainer}>This sends your location and trip status to your emergency contacts.</p>

          {contacts.length === 0 && (
            <p style={s.noContacts}>
              Add someone to alert before you need this.{' '}
              <button style={s.linkBtn} onClick={() => setView('contacts')}>Add contact →</button>
            </p>
          )}

          <button
            id="suraksha-sos-btn"
            style={s.sosBtn}
            onClick={() => setView('countdown')}
            disabled={loading}
          >
            🚨 I&apos;M STUCK
          </button>

          {error && <p style={s.error}>{error}</p>}
        </div>
      </div>
    );
  }

  // H2 — 5-second countdown undo window
  if (view === 'countdown') {
    const names = contacts.map(c => c.name).join(' and ') || 'your contacts';
    return (
      <div style={s.container}>
        <div style={s.countdownCenter}>
          <div style={s.countdownNum}>{countdown}</div>
          <p style={s.countdownLine}>Sending your location to {names} in {countdown}…</p>
          <button
            id="suraksha-cancel-btn"
            style={s.cancelBtn}
            onClick={() => setView('sos')}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // H3 — Sent confirmation
  if (view === 'sent' && sentResult) {
    const names = sentResult.sentTo.map(c => c.name).join(' and ') || 'your contacts';
    return (
      <div style={s.container}>
        <div style={s.sentCenter}>
          <div style={s.sentCheck}>✅</div>
          <h2 style={s.sentHeading}>Alert sent</h2>
          <p style={s.sentSummary}>
            Sent to {names}: your location, that you last reached your previous stop, and where you were heading.
          </p>

          <div style={s.numbersBox}>
            <p style={s.numbersLabel}>Emergency numbers</p>
            <div style={s.numbersRow}>
              <a href={`tel:${sentResult.localNumbers.national}`} style={s.numberLink}>
                <span style={s.numberVal}>{sentResult.localNumbers.national}</span>
                <span style={s.numberDesc}>National Emergency</span>
              </a>
              <a href={`tel:${sentResult.localNumbers.police}`} style={s.numberLink}>
                <span style={s.numberVal}>{sentResult.localNumbers.police}</span>
                <span style={s.numberDesc}>Police</span>
              </a>
              <a href={`tel:${sentResult.localNumbers.state}`} style={s.numberLink}>
                <span style={s.numberVal}>{sentResult.localNumbers.state}</span>
                <span style={s.numberDesc}>State Helpline</span>
              </a>
            </div>
          </div>

          <div style={s.sentActions}>
            <button style={s.sendAgainBtn} onClick={() => setView('sos')}>Send again</button>
            <button style={s.safeBtn} onClick={onClose}>I&apos;m safe now</button>
          </div>
        </div>
      </div>
    );
  }

  // H4 — Emergency contacts setup
  return <EmergencyContactsSetup contacts={contacts} onSave={setContacts} onBack={() => setView('sos')} />;
}

// H4 component
function EmergencyContactsSetup({
  contacts,
  onSave,
  onBack,
}: {
  contacts: EmergencyContact[];
  onSave: (c: EmergencyContact[]) => void;
  onBack: () => void;
}) {
  const [list, setList] = useState<EmergencyContact[]>(contacts);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const addContact = () => {
    setList(prev => [
      ...prev,
      { id: `ec_${Date.now()}`, name: '', phone: '', deliveryMethod: 'whatsapp' },
    ]);
  };

  const update = (idx: number, field: keyof EmergencyContact, value: string) => {
    setList(prev => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  };

  const remove = (idx: number) => setList(prev => prev.filter((_, i) => i !== idx));

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/users/me/emergency-contacts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts: list }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error?.message ?? 'Failed to save'); return; }
      onSave(json.data?.contacts ?? list);
      onBack();
    } catch {
      setError('Failed to save contacts');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={s.container}>
      <button style={s.backBtn} onClick={onBack}>← Back</button>
      <h2 style={s.heading}>Emergency contacts</h2>
      <p style={s.subheading}>Who should Suraksha alert if you tap I&apos;M STUCK?</p>

      {list.map((c, i) => (
        <div key={c.id} style={s.contactCard}>
          <input
            id={`ec-name-${i}`}
            style={s.input}
            placeholder="Name"
            value={c.name}
            onChange={e => update(i, 'name', e.target.value)}
          />
          <input
            id={`ec-phone-${i}`}
            style={s.input}
            placeholder="+91 XXXXX XXXXX"
            value={c.phone}
            onChange={e => update(i, 'phone', e.target.value)}
          />
          <div style={s.methodRow}>
            <span style={s.methodLabel}>Notify via:</span>
            {(['whatsapp', 'sms'] as const).map(m => (
              <label key={m} style={s.methodOption}>
                <input
                  type="radio"
                  name={`method-${i}`}
                  value={m}
                  checked={c.deliveryMethod === m}
                  onChange={() => update(i, 'deliveryMethod', m)}
                />
                {m === 'whatsapp' ? '💬 WhatsApp' : '📱 SMS'}
              </label>
            ))}
            <button style={s.removeBtn} onClick={() => remove(i)}>Remove</button>
          </div>
        </div>
      ))}

      <button id="ec-add-btn" style={s.addBtn} onClick={addContact}>+ Add contact</button>
      {error && <p style={s.error}>{error}</p>}
      <button id="ec-save-btn" style={{ ...s.saveBtn, opacity: saving ? 0.6 : 1 }} onClick={save} disabled={saving}>
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: { padding: 20, maxWidth: 480, margin: '0 auto', fontFamily: 'Inter, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  backBtn: { background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 14, padding: 0 },
  contactsBtn: { background: '#f1f5f9', border: 'none', borderRadius: 20, padding: '6px 14px', fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer' },
  sosCenter: { display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 40, gap: 20 },
  explainer: { fontSize: 15, color: '#475569', textAlign: 'center', maxWidth: 300 },
  noContacts: { fontSize: 13, color: '#94a3b8', textAlign: 'center' },
  linkBtn: { background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  sosBtn: { width: 200, height: 200, borderRadius: '50%', background: 'linear-gradient(135deg, #ef4444, #b91c1c)', color: '#fff', border: 'none', fontSize: 22, fontWeight: 900, cursor: 'pointer', boxShadow: '0 8px 32px rgba(239,68,68,0.4)', letterSpacing: '-0.01em' },
  error: { color: '#ef4444', fontSize: 13, textAlign: 'center' },
  countdownCenter: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 24 },
  countdownNum: { fontSize: 96, fontWeight: 900, color: '#ef4444', lineHeight: 1 },
  countdownLine: { fontSize: 16, color: '#475569', textAlign: 'center', maxWidth: 280 },
  cancelBtn: { padding: '16px 48px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 14, fontSize: 18, fontWeight: 700, cursor: 'pointer' },
  sentCenter: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, paddingTop: 40 },
  sentCheck: { fontSize: 56 },
  sentHeading: { fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0 },
  sentSummary: { fontSize: 14, color: '#475569', textAlign: 'center', maxWidth: 320 },
  numbersBox: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16, width: '100%' },
  numbersLabel: { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 },
  numbersRow: { display: 'flex', gap: 10 },
  numberLink: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 4px', textDecoration: 'none', gap: 4 },
  numberVal: { fontSize: 20, fontWeight: 800, color: '#b91c1c' },
  numberDesc: { fontSize: 10, color: '#94a3b8', textAlign: 'center' },
  sentActions: { display: 'flex', gap: 12, width: '100%' },
  sendAgainBtn: { flex: 1, padding: 14, background: '#f1f5f9', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontSize: 14, color: '#475569' },
  safeBtn: { flex: 1, padding: 14, background: '#22c55e', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontSize: 14 },
  heading: { fontSize: 22, fontWeight: 700, color: '#0f172a', marginBottom: 6 },
  subheading: { fontSize: 14, color: '#64748b', marginBottom: 20 },
  contactCard: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 10 },
  input: { padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, color: '#0f172a', background: '#fff' },
  methodRow: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  methodLabel: { fontSize: 12, fontWeight: 600, color: '#94a3b8' },
  methodOption: { fontSize: 13, color: '#475569', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' },
  removeBtn: { marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', fontSize: 12, cursor: 'pointer', fontWeight: 600 },
  addBtn: { width: '100%', padding: 13, background: '#f1f5f9', border: '1px dashed #cbd5e1', borderRadius: 12, fontSize: 14, fontWeight: 600, color: '#6366f1', cursor: 'pointer', marginBottom: 16 },
  saveBtn: { width: '100%', padding: 14, background: '#6366f1', color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer' },
};
