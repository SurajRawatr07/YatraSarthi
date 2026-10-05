'use client';

import { useState, useEffect } from 'react';
import { Loader2, ExternalLink, CheckCircle, Clock, RefreshCw } from 'lucide-react';

interface Payment {
  id: string;
  memberId: string;
  amount: number;       // paise
  status: 'pending' | 'paid' | 'refunded' | 'failed';
  paymentLinkUrl?: string;
  deadlineAt: string;
  paidAt?: string;
}

interface PaymentStatusProps {
  actionId: string;
  /** Optional member name lookup */
  memberNames?: Record<string, string>;
}

export function PaymentStatus({ actionId, memberNames = {} }: PaymentStatusProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [allPaid, setAllPaid] = useState(false);
  const [deadlineAt, setDeadlineAt] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = async () => {
    try {
      const res = await fetch(`/api/payments/${actionId}`);
      const data = await res.json();
      if (data?.data) {
        setPayments(data.data.payments ?? []);
        setAllPaid(data.data.allPaid ?? false);
        setDeadlineAt(data.data.deadlineAt ?? '');
      }
    } catch {
      setError('Failed to load payment status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!actionId) return;
    fetchPayments();
    const interval = setInterval(fetchPayments, 5000);
    return () => clearInterval(interval);
  }, [actionId]);

  /** Mock: calls the webhook to mark a payment paid */
  const handleMarkPaid = async (paymentId: string) => {
    setMarkingPaid(paymentId);
    setError(null);
    try {
      const res = await fetch('/api/payments/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, status: 'paid' }),
      });
      if (!res.ok) throw new Error('Webhook call failed');
      // Re-fetch after a short delay to pick up the state change
      setTimeout(fetchPayments, 500);
    } catch {
      setError('Failed to mark as paid.');
    } finally {
      setMarkingPaid(null);
    }
  };

  if (loading) {
    return (
      <div className="card p-6 bg-white border flex items-center justify-center gap-2" style={{ borderColor: '#D5D9CC', minHeight: 100 }}>
        <Loader2 size={18} className="animate-spin" style={{ color: '#5F665B' }} />
        <span className="text-sm" style={{ color: '#5F665B' }}>Loading payments…</span>
      </div>
    );
  }

  return (
    <div className="card p-6 bg-white border" style={{ borderColor: '#D5D9CC' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-base" style={{ color: '#172017' }}>Payment Status</h3>
        <div className="flex items-center gap-2">
          {allPaid ? (
            <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: '#DCE8D2', color: '#2E7D32' }}>
              <CheckCircle size={11} /> All paid
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: '#FDF2E0', color: '#9A5A00', border: '1px solid #EFD090' }}>
              <Clock size={11} /> Pending
            </span>
          )}
          <button onClick={fetchPayments} className="p-1.5 rounded-lg border" style={{ borderColor: '#D5D9CC', background: '#EDE9D8' }}>
            <RefreshCw size={12} style={{ color: '#5F665B' }} />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: '#FDECEA', color: '#B03028' }}>
          {error}
        </div>
      )}

      {deadlineAt && !allPaid && (
        <div className="mb-3 p-2 rounded-xl text-xs" style={{ background: '#FDF2E0', color: '#9A5A00' }}>
          ⏱ Payment deadline: {new Date(deadlineAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}

      {payments.length === 0 ? (
        <p className="text-sm" style={{ color: '#5F665B' }}>No payment links generated yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {payments.map((p) => {
            const name = memberNames[p.memberId] ?? p.memberId.slice(0, 8);
            const rupees = Math.round(p.amount / 100);
            const isPaid = p.status === 'paid';
            return (
              <div
                key={p.id}
                className="flex items-center justify-between p-3 rounded-xl"
                style={{
                  background: isPaid ? '#F0F8F0' : '#F5F2E8',
                  border: `1px solid ${isPaid ? '#C6DDA6' : '#D5D9CC'}`,
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: '#172017', color: '#C5D82D' }}
                  >
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: '#172017' }}>{name}</div>
                    <div className="text-xs" style={{ color: '#5F665B' }}>₹{rupees.toLocaleString()}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isPaid ? (
                    <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: '#DCE8D2', color: '#2E7D32' }}>
                      <CheckCircle size={10} /> Paid
                    </span>
                  ) : (
                    <>
                      {p.paymentLinkUrl && (
                        <a
                          href={p.paymentLinkUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border"
                          style={{ background: '#EDE9D8', color: '#172017', borderColor: '#D5D9CC' }}
                        >
                          <ExternalLink size={10} /> Pay link
                        </a>
                      )}
                      {/* Mock "Mark as paid" — calls the webhook stub */}
                      <button
                        onClick={() => handleMarkPaid(p.id)}
                        disabled={markingPaid === p.id}
                        className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: '#172017', color: '#C5D82D' }}
                      >
                        {markingPaid === p.id ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle size={10} />}
                        {markingPaid === p.id ? '…' : 'Mark paid'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {allPaid && (
        <div className="mt-4 p-3 rounded-xl border text-sm font-medium text-center" style={{ background: '#DCE8D2', color: '#172017', borderColor: '#D5D9CC' }}>
          ✓ All members have paid — action advancing to execution
        </div>
      )}
    </div>
  );
}
