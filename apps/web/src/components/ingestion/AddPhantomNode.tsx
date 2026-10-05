'use client';

import { useState, useEffect, useRef } from 'react';
import type { PhantomMode } from '@yatrasarthi/types';
import { ChevronLeft, Train, Car, Bus, Navigation, MapPin, Loader2, Minus, Plus, Info } from 'lucide-react';

const MODES: { value: PhantomMode; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'auto_cab', label: 'Auto / Cab', icon: <Car size={24} />, color: '#F59E0B' },
  { value: 'walk', label: 'Walk', icon: <Navigation size={24} />, color: '#10B981' },
  { value: 'local_train', label: 'Local Train', icon: <Train size={24} />, color: '#3B82F6' },
  { value: 'bus', label: 'Bus', icon: <Bus size={24} />, color: '#8B5CF6' },
  { value: 'other', label: 'Other', icon: <MapPin size={24} />, color: '#64748B' },
];

function formatMinutes(mins: number) {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

interface AddPhantomNodeProps {
  tripId: string;
  onAdded: () => void;
  onBack: () => void;
}

export default function AddPhantomNode({ tripId, onAdded, onBack }: AddPhantomNodeProps) {
  const [mode, setMode] = useState<PhantomMode>('auto_cab');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [paddingMin, setPaddingMin] = useState(0);
  const [estimatedMin, setEstimatedMin] = useState<number | null>(null);
  const [fallbackUsed, setFallbackUsed] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Live routing estimate when from/to are both filled
  useEffect(() => {
    if (!from || !to) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setEstimating(true);
      try {
        const res = await fetch(`/api/routing/estimate?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
        if (res.ok) {
          const json = await res.json();
          setEstimatedMin(json.data?.estimatedMin ?? null);
          setFallbackUsed(json.data?.fallbackUsed ?? false);
        }
      } finally {
        setEstimating(false);
      }
    }, 600);
  }, [from, to]);

  const totalMin = (estimatedMin ?? 0) + paddingMin;

  const handleAdd = async () => {
    if (!from || !to) { setError('From and To are required.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/nodes/phantom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId, mode, fromLabel: from, toLabel: to, paddingMin }),
      });
      if (!res.ok) { setError('Failed to add leg.'); return; }
      onAdded();
    } catch {
      setError('Failed to add leg.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-8 font-sans animate-fade-in">
      <button 
        onClick={onBack} 
        className="flex items-center gap-1.5 text-sm font-semibold text-[#5F665B] hover:text-[#172017] transition-colors mb-6 cursor-pointer"
      >
        <ChevronLeft size={18} /> Back
      </button>

      <div className="mb-10">
        <h2 className="text-3xl font-extrabold text-[#172017] tracking-tight mb-2">Add an unbooked leg</h2>
        <p className="text-[#5F665B] font-medium text-[15px]">Manually add transit gaps like train rides, cabs, or walks to link your bookings.</p>
      </div>

      {/* Mode selector */}
      <div className="mb-10">
        <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-widest mb-4">Mode of travel</p>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 sm:gap-4">
          {MODES.map(m => {
            const isActive = mode === m.value;
            return (
              <button
                key={m.value}
                onClick={() => setMode(m.value)}
                className={`flex flex-col items-center justify-center gap-3 p-4 rounded-3xl transition-all cursor-pointer border ${
                  isActive 
                    ? 'bg-[#172017] text-white border-[#172017] shadow-md scale-105' 
                    : 'bg-white text-[#64748B] border-[#E2E8F0] hover:bg-[#F8FAFC] hover:border-[#CBD5E1]'
                }`}
              >
                <div 
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                    isActive ? 'bg-[#2D3F2D] text-[#C5D82D]' : 'bg-[#F1F5F9] text-inherit'
                  }`}
                >
                  {m.icon}
                </div>
                <span className={`text-[13px] font-bold ${isActive ? 'text-[#C5D82D]' : 'text-[#475569]'}`}>
                  {m.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* From / To */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        <div>
          <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-widest mb-2 ml-2">From</p>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-[#10B981] bg-white z-10" />
            <input 
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl py-4 pl-10 pr-4 text-[15px] font-semibold text-[#172017] focus:outline-none focus:border-[#C5D82D] transition-colors"
              placeholder="e.g. Andheri Station" 
              value={from} 
              onChange={e => setFrom(e.target.value)} 
            />
          </div>
        </div>
        <div>
          <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-widest mb-2 ml-2">To</p>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#3B82F6] z-10" />
            <input 
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl py-4 pl-10 pr-4 text-[15px] font-semibold text-[#172017] focus:outline-none focus:border-[#C5D82D] transition-colors"
              placeholder="e.g. BOM Airport" 
              value={to} 
              onChange={e => setTo(e.target.value)} 
            />
          </div>
        </div>
      </div>

      {/* Estimated time */}
      <div className="mb-10 min-h-[50px]">
        {(estimating || estimatedMin !== null) && (
          <div className="bg-[#E8F0E2] border border-[#DCE8D2] rounded-2xl px-5 py-4 flex items-center justify-between shadow-sm animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#4E8752]">
                {estimating ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
              </div>
              <span className="text-[15px] font-medium text-[#4E8752]">
                {estimating ? 'Estimating travel time...' : 'Estimated travel time'}
                {fallbackUsed && !estimating && <span className="ml-2 text-xs bg-[#FDE68A] text-[#92400E] px-2 py-0.5 rounded-full font-bold">Low Confidence</span>}
              </span>
            </div>
            {!estimating && estimatedMin !== null && (
              <span className="text-xl font-extrabold text-[#172017]">{formatMinutes(estimatedMin)}</span>
            )}
          </div>
        )}
      </div>

      {/* Buffer / padding */}
      <div className="mb-10 bg-white border border-[#E2E8F0] rounded-3xl p-6 shadow-sm">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-lg font-bold text-[#172017] mb-1">Add Buffer Time</p>
            <p className="text-sm text-[#64748B] max-w-sm flex items-center gap-1.5">
              <Info size={14} className="text-[#3B82F6]" />
              Indian traffic can run long. Pad this if you'd rather be early.
            </p>
          </div>
          
          <div className="flex items-center gap-4 bg-[#F8FAFC] p-2 rounded-2xl border border-[#E2E8F0]">
            <button 
              onClick={() => setPaddingMin(p => Math.max(0, p - 5))}
              className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm border border-[#E2E8F0] text-[#172017] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
            >
              <Minus size={18} />
            </button>
            <div className="flex flex-col items-center min-w-[70px]">
              <span className="text-xl font-black text-[#172017] leading-none">{paddingMin}</span>
              <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest mt-1">Min</span>
            </div>
            <button 
              onClick={() => setPaddingMin(p => p + 5)}
              className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm border border-[#E2E8F0] text-[#172017] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>
        
        {estimatedMin !== null && (
          <div className="mt-6 pt-5 border-t border-[#E2E8F0] flex justify-between items-center">
            <span className="text-sm font-bold text-[#64748B] uppercase tracking-widest">Total Journey Time</span>
            <span className="text-2xl font-black text-[#172017] bg-[#DCE8D2] px-4 py-1.5 rounded-xl">{formatMinutes(totalMin)}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-[#FEF2F2] border border-[#FCA5A5] flex items-center gap-3 animate-slide-up">
          <span className="w-2 h-2 rounded-full bg-[#DC2626]" />
          <p className="text-sm font-bold text-[#991B1B]">{error}</p>
        </div>
      )}

      <button 
        className={`w-full py-4.5 rounded-2xl text-lg font-extrabold flex items-center justify-center gap-2 transition-all shadow-md ${
          loading 
            ? 'bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed' 
            : 'bg-[#172017] text-[#C5D82D] hover:bg-[#2D3F2D] hover:-translate-y-1 hover:shadow-lg cursor-pointer'
        }`}
        onClick={handleAdd} 
        disabled={loading}
      >
        {loading ? (
          <><Loader2 size={20} className="animate-spin" /> Adding Leg...</>
        ) : (
          'Add Manual Leg'
        )}
      </button>
    </div>
  );
}
