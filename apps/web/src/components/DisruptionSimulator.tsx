import { useState } from 'react';
import { AlertTriangle, Play, Loader, Clock, Ban, Train, Car, CloudRain, User } from 'lucide-react';

// Scenario definitions — each maps to a node type + delay for the API call
export const disruptionScenarios = [
  {
    id: 'flight_delay',
    label: 'IndiGo 6E-204 Delayed',
    description: 'Flight delayed by 2h 15m. Impacts cab pickup and Airbnb check-in window.',
    icon: <Clock size={16} />,
    type: 'flight',
    delayMinutes: 135,
    source: 'flight_provider',
  },
  {
    id: 'train_delay',
    label: 'Vande Bharat Delayed',
    description: 'Delayed by 4 hours. Group misses Goa connecting cab.',
    icon: <Train size={16} />,
    type: 'train',
    delayMinutes: 240,
    source: 'train_unofficial',
  },
  {
    id: 'cab_cancel',
    label: 'Cab driver cancelled',
    description: 'Shared cab from airport cancelled 15 mins before arrival.',
    icon: <Ban size={16} />,
    type: 'cab',
    delayMinutes: 90,
    source: 'user_reported',
  },
  {
    id: 'weather',
    label: 'Heavy rain alert',
    description: 'Red alert in destination city. High risk of localized flooding.',
    icon: <CloudRain size={16} />,
    type: 'cab',
    delayMinutes: 180,
    source: 'road_eta',
  },
  {
    id: 'member_sick',
    label: 'Member dropping out',
    description: 'Member reporting sick, dropping out. Requires plan recalculation.',
    icon: <User size={16} />,
    type: 'phantom',
    delayMinutes: 60,
    source: 'user_reported',
  },
];

// Icons are included directly in the scenario objects now.

const processingSteps = [
  'Detecting disruption…',
  'Tracing dependencies…',
  'Calculating available slack…',
  'Checking hard constraints…',
  'Checking vendor rules…',
  'Generating recovery options…',
];

// Shape returned by POST /api/disruptions/report
interface CascadeEffect {
  nodeId: string;
  label: string;
  consequence: string;
  estimatedCost: number;
  hard: boolean;
}

interface DisruptionResult {
  disruptionId: string;
  brokenNode: { nodeId: string; label: string; delayMinutes: number; source: string };
  effects: CascadeEffect[];
  affectedMemberIds: string[];
  healthScore: number;
}

interface DisruptionSimulatorProps {
  /** tripId: needed to call the real disruptions API */
  tripId: string;
  /** nodes: used to find the first node matching the scenario type */
  nodes?: { id: string; type: string; label: string }[];
  /** Called with the full disruption result once the cascade is computed */
  onDisrupt: (scenarioId: string, result?: DisruptionResult) => void;
  isDisrupted: boolean;
}

export function DisruptionSimulator({ tripId, nodes = [], onDisrupt, isDisrupted }: DisruptionSimulatorProps) {
  const dynamicScenarios = nodes.length > 0 ? nodes.slice(0, 4).map(node => {
    let delayMinutes = 120;
    let label = `${node.label} Delayed`;
    let description = `Delayed by ${delayMinutes}m, impacting downstream connections.`;
    let icon = <Clock size={16} />;
    let source = 'flight_provider';

    if (node.type === 'cab') {
      delayMinutes = 90;
      label = `${node.label} Cancelled`;
      description = `Driver cancelled at the last minute.`;
      icon = <Ban size={16} />;
      source = 'user_reported';
    } else if (node.type === 'hotel') {
      delayMinutes = 180;
      label = `${node.label} Issue`;
      description = `Check-in delayed due to room unavailability.`;
      icon = <Clock size={16} />;
      source = 'user_reported';
    } else if (node.type === 'train') {
      delayMinutes = 240;
      source = 'train_unofficial';
      icon = <Train size={16} />;
    } else if (node.type === 'phantom') {
      label = `Traffic for ${node.label}`;
      description = `Unexpected delays on this route.`;
      delayMinutes = 60;
      source = 'road_eta';
      icon = <Car size={16} />;
    }
    
    return {
      id: `delay_${node.id}`,
      label,
      description,
      icon,
      type: node.type,
      delayMinutes,
      source,
      nodeId: node.id
    };
  }) : disruptionScenarios;

  const [selected, setSelected] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<DisruptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSimulate = async () => {
    if (!selected || processing) return;

    const scenario = dynamicScenarios.find((s) => s.id === selected);
    if (!scenario) return;

    setProcessing(true);
    setDone(false);
    setError(null);
    setResult(null);
    setStep(0);

    // Animate the processing steps in parallel with the real API call
    const animateTick = (i: number) => {
      setStep(i);
      if (i < processingSteps.length - 1) {
        setTimeout(() => animateTick(i + 1), 500);
      }
    };
    animateTick(0);

    try {
      // Find the specific node or first matching type
      const targetNode = nodes.find((n) => n.id === (scenario as any).nodeId) ?? nodes.find((n) => n.type === scenario.type) ?? nodes[0];

      let cascadeResult: DisruptionResult | undefined;

      if (targetNode && tripId && tripId !== 'default') {
        // Real API call — use the contract field name `delayMinutes`
        const res = await fetch('/api/disruptions/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nodeId: targetNode.id,
            delayMinutes: scenario.delayMinutes,
            source: scenario.source,
          }),
        });

        if (res.ok) {
          const json = await res.json();
          cascadeResult = json?.data as DisruptionResult;
          setResult(cascadeResult);
        }
      }

      // Wait for animation to finish (last step takes ~3s total)
      setTimeout(() => {
        setProcessing(false);
        setDone(true);
        onDisrupt(selected, cascadeResult);
      }, processingSteps.length * 500 + 100);
    } catch (err) {
      setProcessing(false);
      setError('Could not reach the server. Disruption simulated locally.');
      setDone(true);
      onDisrupt(selected, undefined);
    }
  };

  return (
    <div className="card p-6" style={{ background: '#FFFFFF', borderColor: '#D5D9CC' }}>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center border" style={{ background: '#FDEDEC', borderColor: '#F5B7B1' }}>
          <AlertTriangle size={16} style={{ color: '#D93829' }} />
        </div>
        <div>
          <h3 className="font-bold" style={{ color: '#172017' }}>Disruption Simulator</h3>
          <p className="text-xs" style={{ color: '#5F665B' }}>See how your connected trip responds · Live cascade</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {dynamicScenarios.map((scenario) => (
          <button
            key={scenario.id}
            onClick={() => setSelected(scenario.id)}
            className="flex items-center gap-2.5 p-3 rounded-xl text-sm text-left transition-all"
            style={{
              background: selected === scenario.id ? '#FDEDEC' : '#F5F2E8',
              border: `1px solid ${selected === scenario.id ? '#D93829' : '#D5D9CC'}`,
              color: selected === scenario.id ? '#D93829' : '#5F665B',
              fontWeight: selected === scenario.id ? 600 : 500,
            }}
          >
            <span style={{ color: selected === scenario.id ? '#D93829' : '#5F665B' }}>
              {scenario.icon}
            </span>
            <span className="text-xs leading-tight">{scenario.label}</span>
          </button>
        ))}
      </div>

      {processing && (
        <div className="mb-4 p-4 rounded-xl border" style={{ background: '#EDE9D8', borderColor: '#D5D9CC' }}>
          <div className="flex flex-col gap-1.5">
            {processingSteps.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-xs transition-all"
                style={{ color: i <= step ? '#172017' : '#858B80' }}>
                {i < step ? (
                  <span style={{ color: '#2E7D32', fontWeight: 'bold' }}>✓</span>
                ) : i === step ? (
                  <Loader size={11} style={{ color: '#172017', animation: 'spin 1s linear infinite' }} />
                ) : (
                  <span className="w-3 h-3 rounded-full border inline-block" style={{ borderColor: '#D5D9CC' }} />
                )}
                {s}
              </div>
            ))}
          </div>
        </div>
      )}

      {done && !processing && (
        <div className="mb-4 p-4 rounded-xl border" style={{ background: '#FDEDEC', borderColor: '#F5B7B1' }}>
          <div className="font-semibold text-sm mb-1" style={{ color: '#D93829' }}>Cascade detected</div>
          {result ? (
            <div className="flex flex-col gap-1">
              <div className="text-xs" style={{ color: '#5F665B' }}>
                <span className="font-semibold">{result.brokenNode.label}</span> delayed by{' '}
                <span className="font-semibold">{result.brokenNode.delayMinutes}m</span>
              </div>
              {result.effects.length > 0 && (
                <div className="mt-1.5 flex flex-col gap-1">
                  {result.effects.slice(0, 3).map((effect) => (
                    <div key={effect.nodeId} className="text-xs flex items-start gap-1.5" style={{ color: '#5F665B' }}>
                      <span style={{ color: effect.hard ? '#D93829' : '#B06000' }}>
                        {effect.hard ? '🔴' : '🟡'}
                      </span>
                      <span>{effect.label} — {effect.consequence}</span>
                    </div>
                  ))}
                  {result.effects.length > 3 && (
                    <div className="text-xs" style={{ color: '#858B80' }}>
                      +{result.effects.length - 3} more affected
                    </div>
                  )}
                </div>
              )}
              <div className="mt-2 text-xs font-semibold" style={{ color: '#5F665B' }}>
                Recovery options generated → Recovery tab
              </div>
            </div>
          ) : (
            <div className="text-xs" style={{ color: '#5F665B' }}>
              {error ?? 'Disruption simulated. Recovery options generated in Recovery tab.'}
            </div>
          )}
        </div>
      )}

      {error && !processing && (
        <div className="mb-3 text-xs px-3 py-2 rounded-xl" style={{ background: '#FFF3CD', color: '#856404' }}>
          {error}
        </div>
      )}

      <button
        onClick={handleSimulate}
        disabled={!selected || processing}
        className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2"
        style={{ opacity: !selected || processing ? 0.5 : 1, cursor: !selected || processing ? 'not-allowed' : 'pointer' }}
      >
        {processing ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={14} />}
        {processing ? 'Simulating…' : 'Simulate disruption'}
      </button>
    </div>
  );
}
