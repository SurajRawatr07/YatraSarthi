import type { Traveller } from '../types';
import { CheckCircle, Clock, Send } from 'lucide-react';

interface GroupPanelProps {
  travellers: Traveller[];
  totalAmount?: number;
  paymentWindow?: string;
}

export function GroupPanel({ travellers, totalAmount = 2400, paymentWindow = '08:42' }: GroupPanelProps) {
  const paid = travellers.filter(t => t.paymentStatus === 'paid').length;
  const progress = (paid / travellers.length) * 100;

  return (
    <div className="card p-6" style={{ background: '#FFFFFF', borderColor: '#D5D9CC' }}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold" style={{ color: '#172017' }}>Group Coordination</h3>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full border" style={{ background: '#DCE8D2', color: '#172017', borderColor: '#D5D9CC' }}>
          {travellers.length} travellers
        </span>
      </div>

      {/* Members */}
      <div className="flex flex-col gap-3 mb-5">
        {travellers.map(t => (
          <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl border" style={{ background: '#F5F2E8', borderColor: '#D5D9CC' }}>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-[#F5F2E8]"
              style={{ background: ['#172017', '#4E8752', '#2E5A88', '#5F665B'][travellers.indexOf(t) % 4] }}
            >
              {t.avatar}
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm" style={{ color: '#172017' }}>{t.name}</div>
              <div className="text-xs" style={{ color: '#5F665B' }}>Share: ₹{t.amount}</div>
            </div>
            <div>
              {t.paymentStatus === 'paid' ? (
                <span className="flex items-center gap-1 text-xs font-semibold status-confirmed px-2 py-1 rounded-full">
                  <CheckCircle size={11} /> Paid
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-semibold status-pending px-2 py-1 rounded-full">
                  <Clock size={11} /> Awaiting
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Payment progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium" style={{ color: '#5F665B' }}>Payment progress</span>
          <span className="text-sm font-bold" style={{ color: '#172017' }}>{paid}/{travellers.length} paid</span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: '#D5D9CC' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${progress}%`, background: '#172017' }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs" style={{ color: '#5F665B' }}>Total: ₹{totalAmount.toLocaleString()}</span>
          <span className="text-xs font-semibold" style={{ color: '#172017' }}>⏱ {paymentWindow} remaining</span>
        </div>
      </div>

      <button className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-sm">
        <Send size={14} />
        Request payment from group
      </button>

      <p className="text-xs mt-3 text-center" style={{ color: '#858B80' }}>
        Each member receives an individual payment link. Recovery executes only after all payments confirmed.
      </p>
    </div>
  );
}
