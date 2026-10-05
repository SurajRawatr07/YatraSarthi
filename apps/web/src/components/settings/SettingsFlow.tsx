'use client';

import { useState, useEffect } from 'react';
import type { User } from '@yatrasarthi/types';

// I1–I5 Settings screens as a tabbed component
// I1: Profile & account
// I2: Notification preferences
// I3: Subscription / Pro
// I4: Policy library / help
// I5: Trip history (reads from GET /api/trips?status=completed — Person 1's route)

type SettingsTab = 'profile' | 'notifications' | 'subscription' | 'policy' | 'history';

interface SettingsFlowProps {
  onNavigateToTrip?: (tripId: string) => void;
}

export default function SettingsFlow({ onNavigateToTrip }: SettingsFlowProps) {
  const [tab, setTab] = useState<SettingsTab>('profile');
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    fetch('/api/users/me')
      .then(r => r.json())
      .then(j => { if (j.data) setUser(j.data); })
      .catch(() => {})
      .finally(() => setLoadingUser(false));
  }, []);

  const TABS: { id: SettingsTab; label: string }[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'subscription', label: 'Pro' },
    { id: 'policy', label: 'Policy help' },
    { id: 'history', label: 'Past trips' },
  ];

  return (
    <div style={s.page}>
      {/* Tab bar */}
      <div style={s.tabBar}>
        {TABS.map(t => (
          <button
            key={t.id}
            id={`settings-tab-${t.id}`}
            style={{ ...s.tab, ...(tab === t.id ? s.tabActive : {}) }}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={s.content}>
        {loadingUser && tab === 'profile' ? (
          <p style={s.loading}>Loading…</p>
        ) : (
          <>
            {tab === 'profile' && <ProfileTab user={user} onUserUpdate={setUser} />}
            {tab === 'notifications' && <NotificationsTab user={user} onUserUpdate={setUser} />}
            {tab === 'subscription' && <SubscriptionTab user={user} />}
            {tab === 'policy' && <PolicyTab />}
            {tab === 'history' && <HistoryTab onNavigateToTrip={onNavigateToTrip} />}
          </>
        )}
      </div>
    </div>
  );
}

// ── I1: Profile & account ──────────────────────────────────────────────────
function ProfileTab({ user, onUserUpdate }: { user: User | null; onUserUpdate: (u: User) => void }) {
  const [name, setName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => { setName(user?.name ?? ''); }, [user]);

  const save = async () => {
    setSaving(true); setMsg('');
    try {
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const j = await res.json();
      if (res.ok) { onUserUpdate(j.data); setMsg('Saved.'); }
      else setMsg(j.error?.message ?? 'Failed to save.');
    } catch { setMsg('Failed to save.'); }
    finally { setSaving(false); }
  };

  const deleteAccount = async () => {
    setDeleting(true); setDeleteError('');
    try {
      const res = await fetch('/api/users/me', { method: 'DELETE' });
      const j = await res.json();
      if (res.ok) { window.location.href = '/'; }
      else setDeleteError(j.error?.message ?? 'Failed to delete account.');
    } catch { setDeleteError('Failed to delete account.'); }
    finally { setDeleting(false); }
  };

  return (
    <div style={s.section}>
      <h2 style={s.heading}>Profile &amp; account</h2>

      <label style={s.label}>Name</label>
      <input id="profile-name" style={s.input} value={name} onChange={e => setName(e.target.value)} />

      <label style={s.label}>Phone number</label>
      <input style={{ ...s.input, background: '#f1f5f9', color: '#94a3b8' }} value={user?.phone ?? ''} readOnly />
      <p style={s.hint}>Phone number is tied to your sign-in and can&apos;t be changed here.</p>

      {msg && <p style={{ color: msg === 'Saved.' ? '#22c55e' : '#ef4444', fontSize: 13 }}>{msg}</p>}
      <button id="profile-save" style={s.primaryBtn} onClick={save} disabled={saving}>
        {saving ? 'Saving…' : 'Save changes'}
      </button>

      <div style={s.danger}>
        <h3 style={s.dangerHeading}>Delete account</h3>
        <p style={s.dangerNote}>Your bookings are removed. Trips shared with a group stay visible to other members, without your details.</p>
        {!confirmDelete ? (
          <button id="profile-delete" style={s.dangerBtn} onClick={() => setConfirmDelete(true)}>Delete account</button>
        ) : (
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={s.dangerBtnConfirm} onClick={deleteAccount} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Yes, delete'}
            </button>
            <button style={s.cancelBtn} onClick={() => setConfirmDelete(false)}>Cancel</button>
          </div>
        )}
        {deleteError && <p style={s.errorMsg}>{deleteError}</p>}
      </div>
    </div>
  );
}

// ── I2: Notification preferences ──────────────────────────────────────────
function NotificationsTab({ user, onUserUpdate }: { user: User | null; onUserUpdate: (u: User) => void }) {
  const prefs = user?.notificationPrefs ?? { disruptionAlerts: 'on', phantomWarnings: true, paymentRequests: true, groupActivity: true };
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const update = async (patch: Partial<typeof prefs>) => {
    setSaving(true); setMsg('');
    try {
      const res = await fetch('/api/users/me/notification-prefs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const j = await res.json();
      if (res.ok && user) onUserUpdate({ ...user, notificationPrefs: j.data?.notificationPrefs ?? prefs });
      else setMsg(j.error?.message ?? 'Failed to save.');
    } catch { setMsg('Failed to save.'); }
    finally { setSaving(false); }
  };

  return (
    <div style={s.section}>
      <h2 style={s.heading}>Notification preferences</h2>

      <div style={s.prefRow}>
        <div>
          <p style={s.prefLabel}>Disruption alerts</p>
          <p style={s.prefDesc}>Can&apos;t be fully turned off — only quieted, since they&apos;re safety-relevant.</p>
        </div>
        <select
          id="notif-disruption"
          style={s.select}
          value={prefs.disruptionAlerts}
          onChange={e => update({ disruptionAlerts: e.target.value as 'on' | 'quiet' })}
          disabled={saving}
        >
          <option value="on">On</option>
          <option value="quiet">Quiet</option>
        </select>
      </div>

      {([
        { id: 'phantomWarnings', label: 'Proactive phantom-node warnings', desc: 'Alerts when a manual leg might not have enough time.' },
        { id: 'paymentRequests', label: 'Payment requests', desc: 'When a group split payment is created for you.' },
        { id: 'groupActivity', label: 'Group activity', desc: 'When members join, add bookings, or agree to recovery plans.' },
      ] as const).map(({ id, label, desc }) => (
        <div key={id} style={s.prefRow}>
          <div>
            <p style={s.prefLabel}>{label}</p>
            <p style={s.prefDesc}>{desc}</p>
          </div>
          <label style={s.toggle}>
            <input
              id={`notif-${id}`}
              type="checkbox"
              checked={!!(prefs as any)[id]}
              onChange={e => update({ [id]: e.target.checked })}
              disabled={saving}
            />
            <span style={{ ...s.toggleSlider, background: (prefs as any)[id] ? '#6366f1' : '#cbd5e1' }} />
          </label>
        </div>
      ))}

      {msg && <p style={s.errorMsg}>{msg}</p>}
    </div>
  );
}

// ── I3: Subscription / Pro ─────────────────────────────────────────────────
function SubscriptionTab({ user }: { user: User | null }) {
  const [plan, setPlan] = useState<'per_trip' | 'annual'>('annual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const tier = user?.subscription?.tier ?? 'free';

  const upgrade = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/users/me/subscription/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const j = await res.json();
      if (res.ok && j.data?.paymentLinkUrl) {
        window.open(j.data.paymentLinkUrl, '_blank');
      } else {
        setError(j.error?.message ?? 'Failed to create payment link.');
      }
    } catch { setError('Failed to create payment link.'); }
    finally { setLoading(false); }
  };

  return (
    <div style={s.section}>
      <h2 style={s.heading}>Subscription</h2>

      {tier === 'pro' ? (
        <div style={s.proBadge}>
          <span style={s.proBadgeIcon}>⭐</span>
          <span>You&apos;re on Pro</span>
          {user?.subscription?.expiresAt && (
            <span style={s.proExpiry}>Valid until {new Date(user.subscription.expiresAt).toLocaleDateString('en-IN')}</span>
          )}
        </div>
      ) : (
        <>
          <div style={s.compareGrid}>
            <div style={s.compareCol}>
              <p style={s.compareTitle}>Free</p>
              {['Parsing & extraction', 'Trip timeline', 'Health score', 'Passive alerts'].map(f => (
                <p key={f} style={s.compareFeature}>✓ {f}</p>
              ))}
            </div>
            <div style={{ ...s.compareCol, ...s.compareColPro }}>
              <p style={s.compareTitle}>Pro ⭐</p>
              {['Group sync', 'Recovery plans', 'Split payments', 'Vendor email drafts', 'Suraksha contacts'].map(f => (
                <p key={f} style={s.compareFeature}>✓ {f}</p>
              ))}
            </div>
          </div>

          <div style={s.planToggle}>
            {(['annual', 'per_trip'] as const).map(p => (
              <button
                key={p}
                id={`sub-plan-${p}`}
                style={{ ...s.planBtn, ...(plan === p ? s.planBtnActive : {}) }}
                onClick={() => setPlan(p)}
              >
                {p === 'annual' ? 'Annual — ₹599' : 'Per trip — ₹99'}
              </button>
            ))}
          </div>

          {error && <p style={s.errorMsg}>{error}</p>}
          <button
            id="sub-upgrade-btn"
            style={{ ...s.primaryBtn, opacity: loading ? 0.6 : 1 }}
            onClick={upgrade}
            disabled={loading}
          >
            {loading ? 'Opening payment…' : 'Upgrade to Pro'}
          </button>
        </>
      )}
    </div>
  );
}

// ── I4: Policy library / help ──────────────────────────────────────────────
interface PolicyRule { ruleId: string; vendor: string; fareClass?: string; text: string; sourceUrl: string; effectiveFrom: string }

function PolicyTab() {
  const [rules, setRules] = useState<PolicyRule[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/policy-library')
      .then(r => r.json())
      .then(j => setRules(j.data?.rules ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = rules.filter(r =>
    !search || r.vendor.toLowerCase().includes(search.toLowerCase()) || r.text.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={s.section}>
      <h2 style={s.heading}>Policy library &amp; help</h2>
      <p style={s.prefDesc}>Cancellation and refund rules the app uses when reviewing your bookings.</p>

      <input
        id="policy-search"
        style={{ ...s.input, marginBottom: 16 }}
        placeholder="Search vendor or rule…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {loading ? <p style={s.loading}>Loading…</p> : filtered.map(rule => (
        <div key={rule.ruleId} style={s.policyCard}>
          <div style={s.policyHeader}>
            <span style={s.policyVendor}>{rule.vendor}</span>
            {rule.fareClass && <span style={s.policyClass}>{rule.fareClass}</span>}
          </div>
          <p style={s.policyText}>{rule.text}</p>
          {rule.sourceUrl && (
            <a href={rule.sourceUrl} target="_blank" rel="noopener noreferrer" style={s.policyLink}>
              Source →
            </a>
          )}
        </div>
      ))}

      <div style={s.faqSection}>
        <h3 style={s.faqHeading}>FAQ</h3>
        {[
          { q: 'How does recovery ranking work?', a: 'We rank options by cost, arrival time, and bookings preserved. The recommended option is the Pareto-optimal choice across all three.' },
          { q: 'How do split payments work?', a: 'Once your group agrees on a recovery option, each member gets a payment link for their share. Everyone must pay within 20 minutes or the option expires.' },
          { q: 'What does "Pending vendor" mean?', a: 'Your message has been sent to the vendor. The trip stays in the resolving state until they confirm or you mark the action as done.' },
        ].map(({ q, a }) => (
          <div key={q} style={s.faqItem}>
            <p style={s.faqQ}>{q}</p>
            <p style={s.faqA}>{a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── I5: Trip history ────────────────────────────────────────────────────────
interface PastTrip { id: string; name: string; destination: string; startDate: string; endDate: string; status: string; activeDisruptionId?: string }

function HistoryTab({ onNavigateToTrip }: { onNavigateToTrip?: (id: string) => void }) {
  const [trips, setTrips] = useState<PastTrip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/trips?status=completed')
      .then(r => r.json())
      .then(j => setTrips(j.data?.trips ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={s.section}>
      <h2 style={s.heading}>Past trips</h2>
      {loading ? <p style={s.loading}>Loading…</p> : trips.length === 0 ? (
        <p style={s.prefDesc}>No completed trips yet.</p>
      ) : trips.map(t => (
        <button
          key={t.id}
          id={`history-trip-${t.id}`}
          style={s.historyCard}
          onClick={() => onNavigateToTrip?.(t.id)}
        >
          <div style={s.historyMeta}>
            <span style={s.historyName}>{t.name}</span>
            <span style={s.historyDest}>{t.destination}</span>
            <span style={s.historyDates}>
              {new Date(t.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              {' → '}
              {new Date(t.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
            {t.activeDisruptionId && (
              <span style={s.historyDisruption}>Had a disruption — resolved ✓</span>
            )}
          </div>
          <span style={s.historyArrow}>→</span>
        </button>
      ))}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { fontFamily: 'Inter, sans-serif', maxWidth: 520, margin: '0 auto' },
  tabBar: { display: 'flex', gap: 0, borderBottom: '1px solid #e2e8f0', overflowX: 'auto' },
  tab: { padding: '12px 16px', background: 'none', border: 'none', borderBottom: '2px solid transparent', fontSize: 13, fontWeight: 600, color: '#94a3b8', cursor: 'pointer', whiteSpace: 'nowrap' },
  tabActive: { color: '#6366f1', borderBottom: '2px solid #6366f1' },
  content: { padding: '20px 16px' },
  section: { display: 'flex', flexDirection: 'column', gap: 14 },
  heading: { fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 },
  label: { fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' },
  input: { padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, color: '#0f172a', background: '#fff' },
  hint: { fontSize: 12, color: '#94a3b8', marginTop: -8 },
  primaryBtn: { padding: '13px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  danger: { marginTop: 24, padding: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 10 },
  dangerHeading: { fontSize: 15, fontWeight: 700, color: '#b91c1c', margin: 0 },
  dangerNote: { fontSize: 13, color: '#7f1d1d', margin: 0 },
  dangerBtn: { alignSelf: 'flex-start', padding: '8px 16px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  dangerBtnConfirm: { padding: '8px 16px', background: '#b91c1c', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  cancelBtn: { padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#475569' },
  errorMsg: { color: '#ef4444', fontSize: 13 },
  prefRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 0', borderBottom: '1px solid #f1f5f9' },
  prefLabel: { fontSize: 14, fontWeight: 600, color: '#0f172a', margin: 0 },
  prefDesc: { fontSize: 12, color: '#94a3b8', margin: '2px 0 0' },
  select: { padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, background: '#fff', color: '#0f172a' },
  toggle: { position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' },
  toggleSlider: { width: 42, height: 24, borderRadius: 12, transition: 'background 0.2s', flexShrink: 0 },
  proBadge: { display: 'flex', alignItems: 'center', gap: 10, padding: 16, background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 12, fontSize: 15, fontWeight: 700, color: '#854d0e' },
  proBadgeIcon: { fontSize: 22 },
  proExpiry: { fontSize: 12, color: '#a16207', marginLeft: 'auto' },
  compareGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  compareCol: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 6 },
  compareColPro: { background: '#eef2ff', border: '1px solid #c7d2fe' },
  compareTitle: { fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 4 },
  compareFeature: { fontSize: 12, color: '#475569', margin: 0 },
  planToggle: { display: 'flex', gap: 10 },
  planBtn: { flex: 1, padding: '10px 12px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#475569' },
  planBtnActive: { background: '#eef2ff', border: '1px solid #a5b4fc', color: '#4f46e5' },
  policyCard: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 6 },
  policyHeader: { display: 'flex', alignItems: 'center', gap: 8 },
  policyVendor: { fontSize: 12, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.06em' },
  policyClass: { fontSize: 11, background: '#e0e7ff', color: '#4338ca', borderRadius: 20, padding: '2px 8px', fontWeight: 600 },
  policyText: { fontSize: 13, color: '#334155', lineHeight: 1.5, margin: 0 },
  policyLink: { fontSize: 12, color: '#6366f1', textDecoration: 'none', alignSelf: 'flex-start' },
  faqSection: { marginTop: 8, display: 'flex', flexDirection: 'column', gap: 10 },
  faqHeading: { fontSize: 14, fontWeight: 700, color: '#0f172a' },
  faqItem: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 },
  faqQ: { fontSize: 13, fontWeight: 600, color: '#0f172a', margin: '0 0 6px' },
  faqA: { fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.5 },
  historyCard: { display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, cursor: 'pointer', textAlign: 'left', width: '100%' },
  historyMeta: { flex: 1, display: 'flex', flexDirection: 'column', gap: 3 },
  historyName: { fontSize: 15, fontWeight: 700, color: '#0f172a' },
  historyDest: { fontSize: 13, color: '#6366f1', fontWeight: 600 },
  historyDates: { fontSize: 12, color: '#94a3b8' },
  historyDisruption: { fontSize: 11, color: '#22c55e', fontWeight: 600 },
  historyArrow: { fontSize: 18, color: '#cbd5e1' },
  loading: { color: '#94a3b8', fontSize: 14 },
};
