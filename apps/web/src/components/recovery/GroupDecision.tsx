'use client';

import { useState, useEffect } from 'react';
import { Check, Clock, ThumbsUp, ThumbsDown, Loader2, MessageSquare } from 'lucide-react';

interface Agreement {
  memberId: string;
  response: 'pending' | 'agreed' | 'declined';
  respondedAt?: string;
}

interface Action {
  id: string;
  state: string;
  agreements: Agreement[];
  costTotal: number;
}

interface GroupDecisionProps {
  actionId: string;
  /** The current user's id — used to highlight "your" row */
  currentUserId?: string;
  /** Optional member name lookup map */
  memberNames?: Record<string, string>;
  onStateChange?: (newState: string) => void;
}

export function GroupDecision({ actionId, currentUserId, memberNames = {}, onStateChange }: GroupDecisionProps) {
  const [action, setAction] = useState<Action | null>(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAction = async () => {
    try {
      const res = await fetch(`/api/actions/${actionId}`);
      const data = await res.json();
      if (data?.data) setAction(data.data);
    } catch {
      setError('Failed to load group decision status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!actionId) return;
    fetchAction();
    // Poll every 5 seconds for updates from other members
    const interval = setInterval(fetchAction, 5000);
    return () => clearInterval(interval);
  }, [actionId]);

  const handleRespond = async (response: 'agreed' | 'declined') => {
    setResponding(true);
    setError(null);
    try {
      const res = await fetch(`/api/actions/${actionId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response, suggestion: suggestion || undefined }),
      });
      const data = await res.json();
      if (data?.data) {
        setAction(data.data);
        onStateChange?.(data.data.state);
      }
      if (response === 'declined') {
        setShowSuggestion(false);
        setSuggestion('');
      }
    } catch {
      setError('Failed to record your response. Please try again.');
    } finally {
      setResponding(false);
    }
  };

  if (loading) {
    return (
      <div className="card p-6 bg-white border flex items-center justify-center gap-2" style={{ borderColor: '#D5D9CC', minHeight: 120 }}>
        <Loader2 size={18} className="animate-spin" style={{ color: '#5F665B' }} />
        <span className="text-sm" style={{ color: '#5F665B' }}>Loading group status…</span>
      </div>
    );
  }

  if (!action) {
    return (
      <div className="card p-6 bg-white border" style={{ borderColor: '#D5D9CC' }}>
        <p className="text-sm" style={{ color: '#5F665B' }}>{error ?? 'No group decision found.'}</p>
      </div>
    );
  }

  const agreements = action.agreements ?? [];
  const myEntry = agreements.find((a) => a.memberId === currentUserId);
  const myResponse = myEntry?.response ?? 'pending';
  const allAgreed = agreements.length > 0 && agreements.every((a) => a.response === 'agreed');
  const anyDeclined = agreements.some((a) => a.response === 'declined');

  return (
    <div className="card p-6 bg-white border" style={{ borderColor: '#D5D9CC' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-base" style={{ color: '#172017' }}>Group Decision</h3>
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-full border"
          style={{
            background: allAgreed ? '#DCE8D2' : anyDeclined ? '#FDECEA' : '#FDF2E0',
            color: allAgreed ? '#172017' : anyDeclined ? '#B03028' : '#9A5A00',
            borderColor: allAgreed ? '#D5D9CC' : anyDeclined ? '#EFAAA5' : '#EFD090',
          }}
        >
          {action.state.replace(/_/g, ' ')}
        </span>
      </div>

      {error && (
        <div className="mb-3 p-3 rounded-xl text-sm" style={{ background: '#FDECEA', color: '#B03028' }}>
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2 mb-4">
        {agreements.map((a) => {
          const name = memberNames[a.memberId] ?? a.memberId.slice(0, 8);
          const isMe = a.memberId === currentUserId;
          return (
            <div
              key={a.memberId}
              className="flex items-center justify-between p-3 rounded-xl"
              style={{
                background: isMe ? '#F0F4EF' : '#F5F2E8',
                border: `1px solid ${isMe ? '#C5D82D' : '#E8E4D8'}`,
              }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: '#172017', color: '#C5D82D' }}
                >
                  {name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-semibold" style={{ color: '#172017' }}>
                  {name} {isMe && <span className="text-xs font-normal" style={{ color: '#5F665B' }}>(you)</span>}
                </span>
              </div>
              <ResponseBadge response={a.response} />
            </div>
          );
        })}
      </div>

      {allAgreed && (
        <div className="p-3 rounded-xl text-sm font-medium text-center mb-4" style={{ background: '#DCE8D2', color: '#172017' }}>
          ✓ Everyone agreed — {action.costTotal > 0 ? 'awaiting payment' : 'execution in progress'}
        </div>
      )}

      {/* Current user's action buttons — only show if still pending */}
      {myResponse === 'pending' && !allAgreed && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <button
              onClick={() => handleRespond('agreed')}
              disabled={responding}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: '#172017', color: '#F5F2E8' }}
            >
              {responding ? <Loader2 size={14} className="animate-spin" /> : <ThumbsUp size={14} />}
              Agree
            </button>
            <button
              onClick={() => setShowSuggestion(!showSuggestion)}
              disabled={responding}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border"
              style={{ background: '#FFFFFF', color: '#172017', borderColor: '#D5D9CC' }}
            >
              <ThumbsDown size={14} />
              Suggest alternative
            </button>
          </div>
          {showSuggestion && (
            <div className="flex flex-col gap-2">
              <textarea
                value={suggestion}
                onChange={(e) => setSuggestion(e.target.value)}
                placeholder="Describe your alternative suggestion…"
                rows={3}
                className="w-full rounded-xl p-3 text-sm resize-none border"
                style={{ borderColor: '#D5D9CC', color: '#172017', background: '#F5F2E8' }}
              />
              <button
                onClick={() => handleRespond('declined')}
                disabled={responding}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border"
                style={{ background: '#FDECEA', color: '#B03028', borderColor: '#EFAAA5' }}
              >
                {responding ? <Loader2 size={14} className="animate-spin" /> : <MessageSquare size={14} />}
                Decline &amp; send suggestion
              </button>
            </div>
          )}
        </div>
      )}

      {myResponse === 'agreed' && !allAgreed && (
        <div className="p-3 rounded-xl text-sm text-center" style={{ background: '#F0F4EF', color: '#4E8752' }}>
          <Check size={14} className="inline mr-1" />
          You agreed — waiting for other members
        </div>
      )}

      {myResponse === 'declined' && (
        <div className="p-3 rounded-xl text-sm text-center" style={{ background: '#FDF2E0', color: '#9A5A00' }}>
          You suggested an alternative. The group will see your message.
        </div>
      )}
    </div>
  );
}

function ResponseBadge({ response }: { response: 'pending' | 'agreed' | 'declined' }) {
  if (response === 'agreed') {
    return (
      <span className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full" style={{ background: '#DCE8D2', color: '#2E7D32' }}>
        <Check size={10} /> Agreed
      </span>
    );
  }
  if (response === 'declined') {
    return (
      <span className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full" style={{ background: '#FDECEA', color: '#B03028' }}>
        <ThumbsDown size={10} /> Declined
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full" style={{ background: '#FDF2E0', color: '#9A5A00' }}>
      <Clock size={10} /> Waiting
    </span>
  );
}
