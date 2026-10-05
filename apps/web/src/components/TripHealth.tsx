import { useEffect, useState } from 'react';
import { AlertTriangle, TrendingUp, CalendarX } from 'lucide-react';

interface TripHealthProps {
  score: number;
  status: string;
  isEmpty?: boolean;
  weakestEdge?: { from: string; to: string; slack: number } | null;
}

const breakdown = [
  { label: 'Schedule', score: 92 },
  { label: 'Booking reliability', score: 94 },
  { label: 'Route risk', score: 86 },
  { label: 'Refund flexibility', score: 90 },
];

export function TripHealth({ score, status, isEmpty, weakestEdge }: TripHealthProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    if (isEmpty) return;
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        setAnimatedScore(s => {
          if (s >= score) { clearInterval(interval); return score; }
          return s + 2;
        });
      }, 20);
      return () => clearInterval(interval);
    }, 200);
    return () => clearTimeout(timeout);
  }, [score, isEmpty]);

  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;
  const color = score >= 80 ? '#2E7D32' : score >= 60 ? '#172017' : '#D93829';
  const statusLabel = score >= 80 ? '🟢 Healthy' : score >= 60 ? '🟡 At Risk' : '🔴 Disrupted';

  return (
    <div className="card p-6" style={{ background: '#FFFFFF', borderColor: '#D5D9CC' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold" style={{ color: '#172017' }}>Trip Health</h3>
        {!isEmpty && (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full border" style={{ background: '#DCE8D2', color: '#172017', borderColor: '#D5D9CC' }}>
            Weakest-link scoring
          </span>
        )}
      </div>

      <div className="flex flex-col md:flex-row items-center gap-8">
        {isEmpty ? (
          <div className="w-full flex flex-col items-center justify-center py-6 text-center text-gray-500">
            <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3 border border-gray-100 shadow-sm">
              <CalendarX size={20} className="text-gray-400" />
            </div>
            <p className="font-extrabold text-[15px] text-[#172017] mb-1">No Itinerary Data</p>
            <p className="text-[13px] text-gray-500 max-w-[280px]">Add your flights, hotels, and transit to generate health predictions and risk analysis.</p>
          </div>
        ) : (
          <>
            {/* Circular score */}
            <div className="relative flex-shrink-0">
              <svg width={120} height={120} viewBox="0 0 120 120">
                <circle cx="60" cy="60" r={radius} fill="none" stroke="#D5D9CC" strokeWidth="10" />
                <circle
                  cx="60" cy="60" r={radius}
                  fill="none"
                  stroke={color}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  transform="rotate(-90 60 60)"
                  style={{ transition: 'stroke-dashoffset 0.1s' }}
                />
                <text x="60" y="55" textAnchor="middle" fontSize="22" fontWeight="800" fill="#172017" fontFamily="Plus Jakarta Sans, sans-serif">
                  {animatedScore}
                </text>
                <text x="60" y="70" textAnchor="middle" fontSize="9" fill="#5F665B" fontFamily="Plus Jakarta Sans, sans-serif">
                  / 100
                </text>
              </svg>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-bold" style={{ color }}>
                {statusLabel}
              </div>
            </div>

            {/* Breakdown */}
            <div className="flex-1 w-full flex flex-col gap-2.5">
              {breakdown.map(b => (
                <div key={b.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[13px] font-medium" style={{ color: '#5F665B' }}>{b.label}</span>
                    <span className="text-[13px] font-bold" style={{ color: '#172017' }}>{b.score}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: '#E2E8F0' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${b.score}%`,
                        background: b.score >= 90 ? '#2E7D32' : b.score >= 80 ? '#4E8752' : '#858B80',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Weakest link */}
      {!isEmpty && weakestEdge && (
        <div className="mt-4 p-3 rounded-xl flex items-start gap-3 border" style={{ background: '#EDE9D8', borderColor: '#D5D9CC' }}>
          <AlertTriangle size={15} style={{ color: '#172017', flexShrink: 0, marginTop: 1 }} />
          <div>
            <div className="text-xs font-bold" style={{ color: '#172017' }}>Weakest link</div>
            <div className="text-xs" style={{ color: '#5F665B' }}>{weakestEdge.from} → {weakestEdge.to}</div>
            <div className="text-xs mt-0.5" style={{ color: '#5F665B' }}>
              {weakestEdge.slack < 0 ? 'Negative slack!' : `Slack: ${weakestEdge.slack}m`} — Suggestion: Add 30 min buffer
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
