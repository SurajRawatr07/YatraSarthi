'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ChevronRight, Loader2 } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface RecoveryOptionData {
  optionId: string;
  name: string;
  explanation?: string;
  netCost: number;
  possibleCompensation?: number;
  arrivalTime: string;
  nodesDropped: string[];
  recommended: boolean;
  scoreBreakdown: { costNorm: number; timeNorm: number; nodesNorm: number };
  changes: { nodeId: string; field: string; from: unknown; to: unknown }[];
  perMemberShare: { memberId: string; amount: number }[];
  quoteExpiresAt: string;
}

interface RecoveryOptionsProps {
  tripId: string;
  /** Pre-loaded options (passed from TripControlCenter when already fetched) */
  options?: RecoveryOptionData[];
  /** Map of nodeId → label for resolving dropped node ids to human-readable names */
  nodeLabels?: Record<string, string>;
  /** Specific node to generate recovery options for (used in What If simulations where trip is not broken) */
  brokenNodeId?: string;
  /** Called when "Propose to group" is clicked; receives the new actionId */
  onProposed?: (actionId: string) => void;
}

interface ExtendedRecoveryOptionData extends RecoveryOptionData {
  computedScore?: number;
}

export function RecoveryOptionsPanel({
  tripId,
  options: initialOptions,
  nodeLabels = {},
  brokenNodeId,
  onProposed,
}: RecoveryOptionsProps) {
  const [options, setOptions] = useState<RecoveryOptionData[]>(initialOptions ?? []);
  const [loading, setLoading] = useState(false);
  const [proposing, setProposing] = useState<string | null>(null);
  const [proposed, setProposed] = useState<string | null>(null);
  const [weights, setWeights] = useState({ cost: 60, time: 20, itinerary: 20 });
  const [view, setView] = useState<'cards' | 'compare'>('cards');
  const [error, setError] = useState<string | null>(null);

  const loadOptions = async () => {
    setLoading(true);
    setError(null);
    try {
      // Pass ?mode=cheapest just to fetch options (backend mode limits to 4, cheapest usually has best variety)
      const url = new URL(`/api/trips/${tripId}/recovery-options`, window.location.origin);
      url.searchParams.set('mode', 'cheapest');
      if (brokenNodeId) url.searchParams.set('brokenNodeId', brokenNodeId);
      
      const res = await fetch(url.toString());
      const data = await res.json();
      // Support both { data: { options } } (contract) and legacy { recoveryOptions }
      const opts = data?.data?.options ?? data?.recoveryOptions ?? [];
      setOptions(opts);
    } catch {
      setError('Failed to load recovery options.');
    } finally {
      setLoading(false);
    }
  };

  const sortedOptions = useMemo(() => {
    if (!options.length) return [];
    const totalW = (weights.cost + weights.time + weights.itinerary) || 1;
    const wC = weights.cost / totalW;
    const wT = weights.time / totalW;
    const wI = weights.itinerary / totalW;

    const scored = options.map(opt => {
      const score = (opt.scoreBreakdown.costNorm * wC) + 
                    (opt.scoreBreakdown.timeNorm * wT) + 
                    (opt.scoreBreakdown.nodesNorm * wI);
      return { ...opt, computedScore: score };
    });

    scored.sort((a, b) => b.computedScore - a.computedScore);
    return scored.map((opt, i) => ({ ...opt, recommended: i === 0 }));
  }, [options, weights]);

  const handlePropose = async (optionId: string) => {
    setProposing(optionId);
    setError(null);
    try {
      const res = await fetch(`/api/actions/${optionId}/propose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId, optionId }),
      });
      const data = await res.json();
      const actionId = data?.data?.action?.id ?? data?.data?.id ?? data?.action?.id ?? optionId;

      const option = options.find((o) => o.optionId === optionId);
      if (option) {
        // If the option adds a phantom node, we need to provide newPhantomNode payload
        const addsPhantom = option.changes.some((c) => c.nodeId === 'phantom_new');
        
        await fetch('/api/itinerary/apply-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tripId,
            actionId,
            optionId,
            changes: option.changes,
            newPhantomNode: addsPhantom ? {
              label: 'Alternate Transit (Auto-generated)',
              type: 'phantom',
              time: new Date(Date.now() + 30 * 60000).toISOString(),
              fromNodeId: brokenNodeId || Object.keys(nodeLabels)[0], 
            } : undefined
          }),
        });
      }

      setProposed(optionId);
      onProposed?.(actionId);
      
      // Auto-scroll to the updated graph at the top of the page
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setError('Failed to update itinerary. Please try again.');
    } finally {
      setProposing(null);
    }
  };

  const scatterData = sortedOptions.map((o, i) => ({
    x: Math.round(o.netCost / 100), // paise → rupees
    y: parseInt(o.arrivalTime.replace(':', '')),
    name: o.name,
    color: ['#172017', '#4E8752', '#858B80'][i % 3],
  }));

  return (
    <div className="card p-6 bg-white border" style={{ borderColor: '#D5D9CC' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h3 className="font-bold text-lg" style={{ color: '#172017' }}>Recovery Options</h3>
          <p className="text-sm mt-0.5" style={{ color: '#5F665B' }}>
            {sortedOptions.length > 0
              ? `${sortedOptions.length} option${sortedOptions.length !== 1 ? 's' : ''} — ranked by preference`
              : 'Load options to see available recovery paths'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {sortedOptions.length > 0 && (
            <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: '#D5D9CC' }}>
              <button
                onClick={() => setView('cards')}
                className="px-3 py-1.5 text-xs font-semibold"
                style={{ background: view === 'cards' ? '#172017' : '#FFFFFF', color: view === 'cards' ? '#F5F2E8' : '#5F665B' }}
              >
                Cards
              </button>
              <button
                onClick={() => setView('compare')}
                className="px-3 py-1.5 text-xs font-semibold"
                style={{ background: view === 'compare' ? '#172017' : '#FFFFFF', color: view === 'compare' ? '#F5F2E8' : '#5F665B' }}
              >
                Compare
              </button>
            </div>
          )}
          <button
            onClick={() => loadOptions()}
            disabled={loading}
            className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl border"
            style={{ borderColor: '#D5D9CC', background: '#EDE9D8', color: '#172017' }}
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <ChevronRight size={13} />}
            {loading ? 'Loading…' : sortedOptions.length > 0 ? 'Refresh' : 'Load options'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: '#FDECEA', color: '#B03028' }}>
          {error}
        </div>
      )}

      {/* Empty state */}
      {sortedOptions.length === 0 && !loading && (
        <div className="text-center py-8" style={{ color: '#5F665B' }}>
          <p className="text-sm mb-4">No options loaded yet.</p>
          <button onClick={() => loadOptions()} className="btn-primary px-5 py-2 text-sm">
            Load recovery options
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {sortedOptions.length > 0 && (
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Sidebar / Preferences */}
          <div className="w-full lg:w-[32%] flex-shrink-0">
            <PreferencesCard weights={weights} setWeights={setWeights} />
          </div>

          {/* Cards/Compare View */}
          <div className="w-full lg:w-[68%] flex-1">
            {view === 'cards' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatePresence mode="popLayout">
                  {sortedOptions.map((option, i) => (
                    <motion.div
                      key={option.optionId}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3 }}
                    >
                      <OptionCard
                        option={option}
                        rank={i}
                        nodeLabels={nodeLabels}
                        isProposed={proposed === option.optionId}
                        isProposing={proposing === option.optionId}
                        onPropose={() => handlePropose(option.optionId)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {view === 'compare' && (
        <div className="card p-6" style={{ background: '#F5F2E8', borderColor: '#D5D9CC' }}>
          <h4 className="font-semibold mb-1" style={{ color: '#172017' }}>Cost vs. Arrival time</h4>
          <p className="text-xs mb-3" style={{ color: '#5F665B' }}>
            Lower-left is better — cheapest and earliest arrival.
          </p>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid stroke="#D5D9CC" strokeDasharray="4 4" />
                <XAxis type="number" dataKey="x" name="Cost" tickFormatter={(v) => `₹${v.toLocaleString()}`} />
                <YAxis type="number" dataKey="y" name="Arrival" />
                <Tooltip
                  formatter={(value: unknown, name: unknown) =>
                    name === 'Cost' ? [`₹${Number(value).toLocaleString()}`, 'Cost'] : [value as number, String(name ?? '')]
                  }
                />
                {scatterData.map((d, i) => (
                  <Scatter key={i} data={[d]} fill={d.color} name={d.name} />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
          </div>
        </div>
      )}
    </div>
  );
}

function OptionCard({
  option,
  rank,
  nodeLabels,
  isProposed,
  isProposing,
  onPropose,
}: {
  option: ExtendedRecoveryOptionData;
  rank: number;
  nodeLabels: Record<string, string>;
  isProposed: boolean;
  isProposing: boolean;
  onPropose: () => void;
}) {
  const colors = ['#172017', '#4E8752', '#858B80'];
  const netCostRupees = Math.round(option.netCost / 100);
  const compensationRupees = option.possibleCompensation ? Math.round(option.possibleCompensation / 100) : 0;

  // Resolve nodeId → label; fall back to the id if not in the map
  const droppedLabels = option.nodesDropped?.map((id) => nodeLabels[id] ?? id) ?? [];

  // Quote expiry countdown
  const expiresAt = option.quoteExpiresAt ? new Date(option.quoteExpiresAt) : null;
  const expiresMinStr = expiresAt
    ? Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 60000)) + 'm'
    : null;

  return (
    <div
      className="card p-5 flex flex-col gap-3 border"
      style={{
        borderColor: option.recommended ? '#C5D82D' : '#D5D9CC',
        background: option.recommended ? '#F9FCF5' : '#FFFFFF',
        boxShadow: option.recommended ? '0 0 0 2px #C5D82D33' : undefined,
      }}
    >
      <div className="flex justify-between items-start mb-2">
        {option.recommended ? (
          <div className="text-xs font-bold px-2 py-1 rounded-full inline-block" style={{ background: '#C5D82D', color: '#172017' }}>
            ⭐ Recommended
          </div>
        ) : <div />}
        <div className="flex flex-col items-end">
          <span className="text-[10px] uppercase font-bold text-gray-500 mb-0.5">Match Score</span>
          <span className="text-2xl font-black leading-none" style={{ color: (option.computedScore ?? 0) >= 0.8 ? '#4E8752' : (option.computedScore ?? 0) >= 0.5 ? '#E5A43F' : '#E45B4D' }}>
            {Math.round((option.computedScore ?? 0) * 100)}<span className="text-sm">%</span>
          </span>
        </div>
      </div>

      <div>
        <div className="font-bold text-sm" style={{ color: colors[rank] ?? '#172017' }}>{option.name}</div>
        {option.explanation && (
          <div className="text-xs mt-1 leading-relaxed" style={{ color: '#5F665B' }}>{option.explanation}</div>
        )}
      </div>

      {/* Highlight Cards Grid */}
      <div className="grid grid-cols-2 gap-2 my-1">
        <div className="rounded-xl p-3 flex flex-col gap-1 border" style={{ background: '#F5F2E8', borderColor: '#EDE9D8' }}>
          <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#858B80' }}>Cost change</div>
          <div className="text-sm font-extrabold" style={{ color: netCostRupees === 0 ? '#4E8752' : '#D93829' }}>
            {netCostRupees === 0 ? '₹0 extra' : `+₹${netCostRupees.toLocaleString()} extra`}
          </div>
        </div>
        
        <div className="rounded-xl p-3 flex flex-col gap-1 border" style={{ background: '#F5F2E8', borderColor: '#EDE9D8' }}>
          <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#858B80' }}>Time impact</div>
          <div className="text-sm font-extrabold" style={{ color: option.scoreBreakdown.timeNorm >= 0.8 ? '#4E8752' : '#D93829' }}>
            {option.scoreBreakdown.timeNorm >= 0.8 ? 'On time' : `ETA ${option.arrivalTime}`}
          </div>
        </div>

        <div className="rounded-xl p-3 flex flex-col gap-1 border" style={{ background: '#F5F2E8', borderColor: '#EDE9D8' }}>
          <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#858B80' }}>Bookings changed</div>
          <div className="text-sm font-extrabold" style={{ color: '#172017' }}>
            {droppedLabels.length === 0 ? 'None' : `${droppedLabels.length} booking${droppedLabels.length > 1 ? 's' : ''}`}
          </div>
        </div>

        <div className="rounded-xl p-3 flex flex-col gap-1 border" style={{ background: '#F5F2E8', borderColor: '#EDE9D8' }}>
          <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#858B80' }}>Legs replaced</div>
          <div className="text-sm font-extrabold" style={{ color: '#172017' }}>
            {!option.changes || option.changes.length === 0 ? 'None' : `${option.changes.length} leg${option.changes.length > 1 ? 's' : ''}`}
          </div>
        </div>
      </div>
      
      {compensationRupees > 0 && (
        <div className="text-[11px] font-semibold flex items-center mt-1" style={{ color: '#4E8752' }}>
          <Check size={12} className="inline mr-1" />
          Eligible for up to ₹{compensationRupees.toLocaleString()} DGCA compensation
        </div>
      )}

      {/* Quote expiry */}
      {expiresMinStr && (
        <div className="text-xs" style={{ color: '#858B80' }}>
          Price valid for ~{expiresMinStr}
        </div>
      )}

      {/* CTA */}
      {isProposed ? (
        <div className="py-2 rounded-xl text-xs font-semibold text-center" style={{ background: '#DCE8D2', color: '#172017' }}>
          ✓ Itinerary Updated
        </div>
      ) : (
        <button
          onClick={onPropose}
          disabled={isProposing}
          className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
          style={{ background: '#172017', color: '#F5F2E8', opacity: isProposing ? 0.7 : 1 }}
        >
          {isProposing ? <Loader2 size={14} className="animate-spin" /> : null}
          {isProposing ? 'Updating…' : 'Update Itinerary'}
        </button>
      )}
    </div>
  );
}

function PreferencesCard({
  weights,
  setWeights,
}: {
  weights: { cost: number; time: number; itinerary: number };
  setWeights: (w: { cost: number; time: number; itinerary: number }) => void;
}) {
  const setPreset = (cost: number, time: number, itinerary: number) => setWeights({ cost, time, itinerary });
  
  return (
    <div className="p-6 rounded-3xl text-white mb-6 relative overflow-hidden" style={{ background: '#13161A', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)' }}>
      {/* Decorative gradient blob */}
      <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-[#45B07C] opacity-[0.03] blur-3xl" />
      
      <div className="relative z-10">
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Optimize For</div>
        <h4 className="text-xl font-bold mb-5 tracking-tight text-[#F9FCF5]">Adjust preferences to re-rank plans</h4>
        
        <div className="flex flex-wrap gap-2.5 mb-7">
          <button onClick={() => setPreset(33, 33, 34)} className="px-3.5 py-1.5 rounded-full text-xs font-semibold hover:bg-[#2D333B] transition-colors border border-transparent hover:border-gray-600" style={{ background: '#22272E', color: '#E5E7EB' }}>⚖️ Balanced</button>
          <button onClick={() => setPreset(80, 10, 10)} className="px-3.5 py-1.5 rounded-full text-xs font-semibold hover:bg-[#2D333B] transition-colors border border-transparent hover:border-gray-600" style={{ background: '#22272E', color: '#45B07C' }}>💰 Cheapest</button>
          <button onClick={() => setPreset(10, 80, 10)} className="px-3.5 py-1.5 rounded-full text-xs font-semibold hover:bg-[#2D333B] transition-colors border border-transparent hover:border-gray-600" style={{ background: '#22272E', color: '#4B7BFF' }}>⚡ Fastest</button>
          <button onClick={() => setPreset(10, 10, 80)} className="px-3.5 py-1.5 rounded-full text-xs font-semibold hover:bg-[#2D333B] transition-colors border border-transparent hover:border-gray-600" style={{ background: '#22272E', color: '#C5D82D' }}>🗺️ Keep trip</button>
        </div>

        <div className="flex flex-col gap-6">
          <SliderRow label="Cost" subtext="Prefer cheaper options" icon="₹" color="#45B07C" value={weights.cost} onChange={(v) => setWeights({...weights, cost: v})} />
          <SliderRow label="Speed" subtext="Minimise delays" icon="⏱" color="#4B7BFF" value={weights.time} onChange={(v) => setWeights({...weights, time: v})} />
          <SliderRow label="Keep itinerary" subtext="Change as little as possible" icon="🗺" color="#C5D82D" value={weights.itinerary} onChange={(v) => setWeights({...weights, itinerary: v})} />
        </div>

        <div className="mt-7 p-4 rounded-xl text-xs flex items-center gap-3" style={{ background: '#1C2128', color: '#9CA3AF' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-[#45B07C] animate-pulse" />
          Moving any slider instantly re-runs the scoring engine and re-orders the plans below.
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        input[type=range].pref-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          box-shadow: 0 0 10px rgba(0,0,0,0.5);
          transition: transform 0.1s;
        }
        input[type=range].pref-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
      `}} />
    </div>
  );
}

function SliderRow({ label, subtext, icon, color, value, onChange }: { label: string, subtext: string, icon: string, color: string, value: number, onChange: (v: number) => void }) {
  return (
    <div className="group">
      <div className="flex justify-between items-end mb-2.5">
        <div className="flex items-center gap-3">
          <span className="w-6 h-6 flex items-center justify-center rounded-md bg-[#22272E] text-sm opacity-80 group-hover:opacity-100 transition-opacity">{icon}</span>
          <div>
            <div className="font-bold text-[15px] leading-tight tracking-wide text-gray-100">{label}</div>
            <div className="text-[11px] text-gray-400 mt-0.5">{subtext}</div>
          </div>
        </div>
        <div className="font-extrabold text-base transition-colors" style={{ color }}>{value}</div>
      </div>
      <input 
        type="range" 
        min="0" max="100" 
        value={value} 
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="pref-slider w-full h-1.5 rounded-full appearance-none outline-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${color} ${value}%, #2D333B ${value}%)`
        }}
      />
    </div>
  );
}
