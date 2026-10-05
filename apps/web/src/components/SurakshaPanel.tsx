import { Shield, MapPin, Battery, Share2, MessageSquare, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import SurakshaFlow from './suraksha/SurakshaFlow';
import type { TripData } from '../types';

export function SurakshaPanel({ trip }: { trip?: TripData | null }) {
  const [showFlow, setShowFlow] = useState(false);
  if (!trip) {
    return <div className="p-8 text-center text-gray-500">No active trip selected for Suraksha.</div>;
  }

  const nodes = trip.nodes || [];
  const currentLoc = nodes.length > 0 ? nodes[0].label : 'Unknown location';
  
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="card p-8 bg-white border border-[#D5D9CC]">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm" style={{ background: '#172017' }}>
            <Shield size={24} color="#C5D82D" />
          </div>
          <div>
            <h2 className="font-extrabold text-2xl" style={{ color: '#172017' }}>🛡️ Suraksha</h2>
            <p className="text-sm" style={{ color: '#5F665B' }}>Your trip's emergency communication layer</p>
          </div>
        </div>

                {/* Big SOS Button */}
        <div className="mb-8">
          <button 
            onClick={() => setShowFlow(true)}
            className="w-full py-8 rounded-[32px] flex flex-col items-center justify-center gap-3 transition-transform hover:scale-[1.02] active:scale-95"
            style={{ 
              background: 'linear-gradient(135deg, #E45B4D 0%, #B0271A 100%)', 
              color: '#FFFFFF', 
              boxShadow: '0 12px 30px -10px rgba(228,91,77,0.5), inset 0 2px 0 rgba(255,255,255,0.2)' 
            }}
          >
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
               <AlertTriangle size={32} />
            </div>
            <div className="flex flex-col items-center">
              <span className="text-3xl font-black tracking-widest uppercase">I'm Stuck (SOS)</span>
              <span className="text-sm font-medium mt-1 opacity-90">Alert emergency contacts & share live tracking instantly</span>
            </div>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Status cards */}
          <div className="p-4 rounded-2xl border border-[#D5D9CC]" style={{ background: '#EDE9D8' }}>
            <div className="flex items-center gap-2 mb-3">
              <MapPin size={16} style={{ color: '#172017' }} />
              <span className="font-bold text-sm" style={{ color: '#172017' }}>Last Known Location</span>
            </div>
            <p className="text-sm font-semibold" style={{ color: '#172017' }}>{currentLoc}</p>
            <p className="text-xs mt-1" style={{ color: '#5F665B' }}>Realtime fetching unavailable</p>
          </div>

          <div className="p-4 rounded-2xl border border-[#D5D9CC]" style={{ background: '#EDE9D8' }}>
            <div className="flex items-center gap-2 mb-3">
              <Battery size={16} style={{ color: '#172017' }} />
              <span className="font-bold text-sm" style={{ color: '#172017' }}>Device Status</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold" style={{ color: '#5F665B' }}>Not connected to device telemetry.</span>
            </div>
          </div>
        </div>

        {/* Journey progress */}
        <div className="p-4 rounded-2xl mb-6" style={{ background: '#F5F2E8', border: '1px solid #D5D9CC' }}>
          <div className="font-bold text-sm mb-3" style={{ color: '#172017' }}>Journey nodes</div>
          <div className="flex flex-col gap-2">
            {nodes.map(n => (
              <div key={n.id} className="text-xs flex items-center gap-2" style={{ color: '#5F665B' }}>
                <div className={`w-2 h-2 rounded-full ${n.status === 'confirmed' || n.status === 'on_track' ? 'bg-[#2E7D32]' : n.status === 'at_risk' ? 'bg-[#C5D82D]' : 'bg-[#D93829]'}`} />
                {n.label} ({new Date(n.time).toLocaleTimeString()})
              </div>
            ))}
          </div>
        </div>

        {/* Emergency contacts */}
        <div className="mb-6">
          <div className="font-bold text-sm mb-3" style={{ color: '#172017' }}>Emergency numbers</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { label: 'National Emergency', number: '112' },
              { label: 'Police', number: '100' },
              { label: 'Ambulance', number: '108' }
            ].map(c => (
              <a
                key={c.number}
                href={`tel:${c.number}`}
                className="p-3 rounded-xl text-center transition-all hover:scale-105"
                style={{ background: '#FDEDEC', border: '1px solid #F5B7B1' }}
              >
                <div className="font-bold text-lg" style={{ color: '#D93829' }}>{c.number}</div>
                <div className="text-xs" style={{ color: '#5F665B' }}>{c.label}</div>
              </a>
            ))}
          </div>
        </div>
      </div>
      {showFlow && trip && (
        <SurakshaFlow
          tripId={trip.id}
          lastNodeId={nodes[0]?.id}
          nextNodeId={nodes[1]?.id}
          onClose={() => setShowFlow(false)}
        />
      )}
    </div>
  );
}
