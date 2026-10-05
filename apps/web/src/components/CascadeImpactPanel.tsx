'use client';

import { useState } from 'react';
import { AlertTriangle, ChevronRight, Loader2, RotateCcw, TrendingDown, ShieldAlert, Info, Sparkles } from 'lucide-react';
import { RecoveryOptionsPanel } from './recovery/RecoveryOptions';

interface HopChainEntry {
  nodeId: string;
  label: string;
  type: string;
  delayMin: number;
  constraint: 'hard' | 'soft';
  reason: string;
  estimatedCost: number;
}

interface SimulationResult {
  brokenNode: { nodeId: string; label: string; delayMinutes: number | null; cancelled: boolean };
  broken: string[];
  atRisk: string[];
  hopChain: HopChainEntry[];
  simulatedHealthScore: number;
  totalEstimatedCost: number;
}

interface CascadeImpactPanelProps {
  tripId: string;
  initialResult?: SimulationResult | null;
  targetNode?: { id: string; label: string; type: string };
  onClose?: () => void;
}

const TYPE_EMOJI: Record<string, string> = {
  flight: '✈️', train: '🚆', hotel: '🏨', cab: '🚕', bus: '🚌', phantom: '📍',
};

function HealthBar({ score }: { score: number }) {
  const isGood = score >= 70;
  const isOk = score >= 40;
  const color = isGood ? 'from-emerald-400 to-green-500' : isOk ? 'from-amber-400 to-orange-500' : 'from-red-500 to-rose-600';
  const textColor = isGood ? 'text-green-600' : isOk ? 'text-orange-600' : 'text-red-600';
  
  return (
    <div className="flex items-center gap-4">
      <div className="flex-1 h-3 rounded-full bg-gray-100 overflow-hidden shadow-inner">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-1000 ease-out`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`text-2xl font-black tracking-tighter ${textColor}`}>{score}</span>
    </div>
  );
}

export function CascadeImpactPanel({ tripId, initialResult, targetNode, onClose }: CascadeImpactPanelProps) {
  const [result, setResult] = useState<SimulationResult | null>(initialResult ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);

  const [delayMinutes, setDelayMinutes] = useState(120);
  const [cancelled, setCancelled] = useState(false);

  const runSimulation = async () => {
    if (!targetNode) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/trips/${tripId}/impact-simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId: targetNode.id,
          delayMinutes: cancelled ? 0 : delayMinutes,
          cancelled,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? 'Simulation failed');
      setResult(json.data);
      setShowRecovery(false);
    } catch (err: any) {
      setError(err.message ?? 'Failed to run simulation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-4 pb-4 border-b border-gray-200/60">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-gradient-to-br from-rose-500 to-red-600 shadow-lg shadow-red-500/20 text-white flex-shrink-0">
          <ShieldAlert size={22} />
        </div>
        <div className="flex-1">
          <h3 className="font-extrabold text-lg text-gray-900 tracking-tight leading-tight">
            {targetNode ? `What if? — ${targetNode.label}` : 'Cascade Impact'}
          </h3>
          <p className="text-[13px] text-gray-500 font-medium">
            {targetNode ? 'Dry-run simulation — nothing is changed' : 'Full multi-hop cascade chain'}
          </p>
        </div>
        {onClose && (
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors flex-shrink-0">
            ✕
          </button>
        )}
      </div>

      {/* What if? controls */}
      {targetNode && (
        <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-80" />
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                Cancelled completely?
              </label>
              <button
                onClick={() => setCancelled(!cancelled)}
                className="relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                style={{ background: cancelled ? '#EF4444' : '#E5E7EB' }}
                aria-label="Toggle cancelled"
              >
                <span
                  className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300"
                  style={{ transform: cancelled ? 'translateX(1.6rem)' : 'translateX(0.2rem)' }}
                />
              </button>
            </div>
            
            <div className={`transition-all duration-300 overflow-hidden ${cancelled ? 'h-0 opacity-0' : 'h-12 opacity-100'}`}>
              <div className="flex items-center gap-4">
                <label className="text-sm font-bold text-gray-700 w-24">Delay time</label>
                <div className="flex-1 relative flex items-center">
                  <input
                    type="range"
                    min={15} max={480} step={15}
                    value={delayMinutes}
                    onChange={(e) => setDelayMinutes(Number(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none outline-none bg-gray-200 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:cursor-pointer hover:[&::-webkit-slider-thumb]:scale-110 transition-transform"
                    style={{ background: `linear-gradient(to right, #2563EB ${(delayMinutes-15)/465*100}%, #E5E7EB ${(delayMinutes-15)/465*100}%)` }}
                  />
                </div>
                <span className="text-sm font-black text-blue-600 w-16 text-right tabular-nums">
                  {delayMinutes >= 60
                    ? `${Math.floor(delayMinutes / 60)}h${delayMinutes % 60 > 0 ? ` ${delayMinutes % 60}m` : ''}`
                    : `${delayMinutes}m`}
                </span>
              </div>
            </div>

            <button
              onClick={runSimulation}
              disabled={loading}
              className="w-full py-3.5 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 bg-gray-900 text-white hover:bg-black hover:shadow-lg hover:-translate-y-0.5 transition-all active:scale-[0.98] disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} className="text-blue-400" />}
              {loading ? 'Simulating impact...' : 'Run Simulation'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl text-sm bg-red-50 border border-red-100 text-red-700 font-medium flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="flex flex-col gap-6 animate-in slide-in-from-bottom-2 fade-in duration-500">
          {/* Simulated health score */}
          <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-green-50 to-transparent rounded-bl-full -z-0" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-gray-700">
                  {targetNode ? 'Simulated health' : 'Current health'}
                </span>
                <span className="text-[10px] uppercase font-black tracking-widest px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                  <Info size={12} className="inline mr-1 -mt-0.5" />Preview
                </span>
              </div>
              <HealthBar score={result.simulatedHealthScore} />
              <div className="mt-4 pt-4 border-t border-gray-100 flex gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 text-red-700"><div className="w-2 h-2 rounded-full bg-red-500"/>{result.broken.length} broken</span>
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700"><div className="w-2 h-2 rounded-full bg-amber-500"/>{result.atRisk.length} at risk</span>
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 text-gray-700"><div className="w-2 h-2 rounded-full bg-green-500"/>₹{(result.totalEstimatedCost / 100).toLocaleString('en-IN')} est. cost</span>
              </div>
            </div>
          </div>

          {/* Multi-hop chain */}
          {result.hopChain.length > 0 ? (
            <div className="flex flex-col">
              <div className="text-sm font-bold text-gray-900 mb-3 ml-1 flex items-center gap-2">
                Cascade Chain
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-semibold">{result.hopChain.length} hop{result.hopChain.length > 1 ? 's' : ''}</span>
              </div>

              <div className="relative">
                {/* Vertical timeline line */}
                <div className="absolute left-[22px] top-[40px] bottom-[30px] w-0.5 bg-gray-200" />
                
                {/* Origin node */}
                <div className="flex items-center gap-3 p-4 rounded-xl bg-white border border-rose-100 shadow-sm relative z-10 mb-3 group hover:border-rose-300 transition-colors">
                  <div className="absolute left-0 top-0 w-1 h-full bg-rose-500 rounded-l-xl" />
                  <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-xl shadow-inner border border-rose-100">
                    {TYPE_EMOJI[result.brokenNode.label?.toLowerCase()] ?? '⚡'}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-black text-rose-600 flex items-center justify-between">
                      {result.brokenNode.label}
                      <AlertTriangle size={14} className="text-rose-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="text-xs font-medium text-gray-500 mt-0.5">
                      {result.brokenNode.cancelled ? 'Cancelled' : `Delayed ${result.brokenNode.delayMinutes}m`}
                      <span className="opacity-50"> — origin disruption</span>
                    </div>
                  </div>
                </div>

                {/* Hops */}
                <div className="flex flex-col gap-3 relative z-10 pl-6">
                  {result.hopChain.map((hop, i) => {
                    const isHard = hop.constraint === 'hard';
                    return (
                      <div key={hop.nodeId} className="relative group">
                        <div className={`absolute -left-[28px] top-5 w-3 h-3 rounded-full border-2 border-white shadow-sm ${isHard ? 'bg-red-500' : 'bg-amber-400'}`} />
                        <div
                          className="flex items-start gap-3 p-4 rounded-xl bg-white border shadow-sm transition-colors"
                          style={{ borderColor: isHard ? '#FECDD3' : '#FEF3C7' }}
                        >
                          <div className={`absolute left-0 top-0 w-1 h-full rounded-l-xl ${isHard ? 'bg-red-500' : 'bg-amber-400'}`} />
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-inner border ${isHard ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'}`}>
                            {TYPE_EMOJI[hop.type] ?? '📌'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-bold text-gray-900 truncate pr-2">{hop.label}</span>
                              <span className={`text-[9px] font-black tracking-wider px-2 py-0.5 rounded-full uppercase ${isHard ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                {isHard ? 'Hard Fail' : 'Soft Fail'}
                              </span>
                            </div>
                            <div className="text-xs font-medium text-gray-500">
                              <span className={`font-bold ${isHard ? 'text-red-600' : 'text-amber-600'}`}>+{hop.delayMin}m delay</span>
                              <span className="mx-1.5 opacity-50">•</span>
                              {hop.reason}
                            </div>
                            {hop.estimatedCost > 0 && (
                              <div className="text-xs font-bold mt-1.5 flex items-center gap-1 text-gray-600">
                                <span className="w-4 h-4 rounded bg-gray-100 flex items-center justify-center">₹</span>
                                {(hop.estimatedCost / 100).toLocaleString('en-IN')} est. cost
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl text-sm text-center font-bold bg-green-50 text-green-700 border border-green-100">
              ✓ Disruption absorbed! No downstream cascade.
            </div>
          )}

          {/* Action buttons */}
          {targetNode && (
            <div className="flex gap-3">
              <button
                onClick={() => setShowRecovery(!showRecovery)}
                className="flex-1 py-3.5 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm"
                style={{ background: 'linear-gradient(135deg, #C5D82D 0%, #B4C626 100%)', color: '#172017', boxShadow: '0 10px 25px -5px rgba(197, 216, 45, 0.4)' }}
              >
                {showRecovery ? 'Hide recovery options' : 'View intelligent recovery plans'}
              </button>
              <button
                onClick={() => { setResult(null); setShowRecovery(false); }}
                className="px-5 py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all shadow-sm"
              >
                <RotateCcw size={16} />
                Clear
              </button>
            </div>
          )}
          
          {/* Recovery Options View */}
          {showRecovery && (
            <div className="animate-in slide-in-from-top-4 fade-in duration-500">
              <RecoveryOptionsPanel tripId={tripId} brokenNodeId={targetNode!.id} />
            </div>
          )}
        </div>
      )}

      {!result && !loading && !targetNode && (
        <div className="py-12 text-center flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center">
            <Sparkles size={24} className="text-gray-300" />
          </div>
          <p className="text-sm font-medium text-gray-500 max-w-[250px]">
            Trigger a disruption from the Simulator tab to see the cascade chain here.
          </p>
        </div>
      )}
    </div>
  );
}
