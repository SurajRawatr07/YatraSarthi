import type { NodeStatus, TrustLevel } from '../types';

export function StatusBadge({ status }: { status: NodeStatus }) {
  const map: Record<NodeStatus, { label: string, className: string }> = {
    confirmed: { label: 'Confirmed', className: 'status-confirmed' },
    on_track: { label: 'On Track', className: 'status-confirmed' },
    at_risk: { label: 'At Risk', className: 'status-pending' },
    broken: { label: 'Broken', className: 'status-disrupted' },
    pending_review: { label: 'Pending Review', className: 'status-pending' },
    cancelled: { label: 'Cancelled', className: 'status-disrupted' },
  };
  const { label, className } = map[status] || map.pending_review;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full" style={{
        background: status === 'confirmed' || status === 'on_track' ? '#63A66B'
          : status === 'at_risk' || status === 'pending_review' ? '#E7A943'
          : '#E45B4D'
      }} />
      {label}
    </span>
  );
}

export function TrustBadge({ level, source, updatedAt }: { level: TrustLevel; source: string; updatedAt?: string }) {
  const map = {
    high: { label: 'High Trust', color: '#2D7A34', bg: '#E8F5EA' },
    medium: { label: 'Medium Trust', color: '#A05B00', bg: '#FDF3E3' },
    low: { label: 'Low Trust', color: '#B53027', bg: '#FDECEA' },
  };
  const { label, color, bg } = map[level];
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-semibold px-2 py-0.5 rounded-full inline-flex" style={{ color, background: bg }}>
        {label}
      </span>
      <span className="text-xs" style={{ color: '#73776E' }}>{source}</span>
      {updatedAt && <span className="text-xs" style={{ color: '#A9C39A' }}>Updated {updatedAt}</span>}
    </div>
  );
}

export function NodeIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    flight: '✈️',
    train: '🚆',
    cab: '🚕',
    hotel: '🏨',
    activity: '🏝️',
    restaurant: '🍽️',
    phantom: '📍',
  };
  return <span style={{ fontSize: 20 }}>{icons[type] || '📌'}</span>;
}
