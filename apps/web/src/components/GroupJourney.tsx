'use client';

import { Users, MapPin, AlertTriangle, ShieldCheck, Clock } from 'lucide-react';
import { DependencyGraph } from './DependencyGraph';
import { CascadeImpactPanel } from './CascadeImpactPanel';
import type { Node, Edge } from '../types';

interface GroupJourneyProps {
  tripId: string;
}

export function GroupJourney({ tripId }: GroupJourneyProps) {
  // --- FAKE DEMO DATA FOR PRESENTATION ---
  const members = [
    { memberId: 'u1', name: 'Rahul Sharma', currentLeg: 'Vistara UK-991 (DEL-GOX)', status: 'broken' },
    { memberId: 'u2', name: 'Priya Patel', currentLeg: 'IndiGo 6E-212 (BOM-GOX)', status: 'on_track' },
    { memberId: 'u3', name: 'Amit Singh', currentLeg: 'AirIndia AI-501 (BLR-GOX)', status: 'on_track' },
    { memberId: 'u4', name: 'Neha Singh', currentLeg: 'AirIndia AI-501 (BLR-GOX)', status: 'on_track' },
  ];

  const sharedNodesList = [
    { nodeId: 'meetup', label: 'Goa Mopa Airport Meetup', sharedByCount: 4 },
    { nodeId: 'hotel', label: 'Goa Marriott Resort & Spa', sharedByCount: 4 },
  ];

  const nodes: Node[] = [
    { id: 'h_flight', tripId, ownerId: 'u1', type: 'flight', label: 'Vistara UK-991 (DEL-GOX)', time: '2026-10-10T10:00:00Z', constraintType: 'hard', status: 'broken', rawExtract: {}, createdAt: '', updatedAt: '' },
    { id: 't_flight', tripId, ownerId: 'u2', type: 'flight', label: 'IndiGo 6E-212 (BOM-GOX)', time: '2026-10-10T11:00:00Z', constraintType: 'hard', status: 'on_track', rawExtract: {}, createdAt: '', updatedAt: '' },
    { id: 'a_flight', tripId, ownerId: 'u3', type: 'flight', label: 'AirIndia AI-501 (BLR-GOX)', time: '2026-10-10T10:30:00Z', constraintType: 'hard', status: 'on_track', rawExtract: {}, createdAt: '', updatedAt: '' },
    { id: 'meetup', tripId, ownerId: 'u1', type: 'phantom', phantomMode: 'other', label: 'Goa Airport Meetup', time: '2026-10-10T12:00:00Z', constraintType: 'soft', status: 'at_risk', rawExtract: {}, createdAt: '', updatedAt: '' },
    { id: 'cab', tripId, ownerId: 'u1', type: 'cab', label: 'MMT Pre-booked Cab', time: '2026-10-10T12:30:00Z', constraintType: 'hard', status: 'at_risk', rawExtract: {}, createdAt: '', updatedAt: '' },
    { id: 'hotel', tripId, ownerId: 'u1', type: 'hotel', label: 'Goa Marriott Resort', time: '2026-10-10T14:00:00Z', constraintType: 'soft', status: 'on_track', rawExtract: {}, createdAt: '', updatedAt: '' },
  ];

  const edges: Edge[] = [
    { id: 'e1', tripId, fromNodeId: 'h_flight', toNodeId: 'meetup', bufferMin: 0, paddingMin: 0, constraint: 'soft', shared: true },
    { id: 'e2', tripId, fromNodeId: 't_flight', toNodeId: 'meetup', bufferMin: 0, paddingMin: 0, constraint: 'soft', shared: true },
    { id: 'e3', tripId, fromNodeId: 'a_flight', toNodeId: 'meetup', bufferMin: 0, paddingMin: 0, constraint: 'soft', shared: true },
    { id: 'e4', tripId, fromNodeId: 'meetup', toNodeId: 'cab', bufferMin: 30, paddingMin: 0, constraint: 'hard', shared: true },
    { id: 'e5', tripId, fromNodeId: 'cab', toNodeId: 'hotel', bufferMin: 90, paddingMin: 0, constraint: 'soft', shared: true },
  ];

  const demoSimulation = {
    brokenNode: { nodeId: 'h_flight', label: 'Vistara UK-991 (DEL-GOX)', delayMinutes: 180, cancelled: false },
    broken: ['cab'],
    atRisk: ['meetup', 'hotel'],
    hopChain: [
      { nodeId: 'meetup', label: 'Goa Airport Meetup', type: 'phantom', delayMin: 180, constraint: 'soft', reason: 'Waiting for Rahul (180m delay)', estimatedCost: 0 },
      { nodeId: 'cab', label: 'MMT Pre-booked Cab', type: 'cab', delayMin: 180, constraint: 'hard', reason: 'Driver wait time exceeded', estimatedCost: 150000 },
      { nodeId: 'hotel', label: 'Goa Marriott Resort', type: 'hotel', delayMin: 180, constraint: 'soft', reason: 'Late check-in', estimatedCost: 0 },
    ],
    simulatedHealthScore: 45,
    totalEstimatedCost: 150000,
  };

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-10 fade-in">
      {/* Trip Header */}
      <div className="relative rounded-3xl overflow-hidden mb-8 shadow-xl bg-gradient-to-r from-emerald-900 to-teal-900 text-white">
        <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?q=80&w=2000')] bg-cover bg-center mix-blend-overlay" />
        <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider">Group Trip (Demo)</span>
              <span className="flex items-center gap-1 text-sm font-medium"><ShieldCheck size={16} className="text-emerald-400" /> Kutumb Active</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2">Goa College Reunion</h1>
            <p className="text-emerald-100 text-lg">4 Travelers • Converging from 3 Cities</p>
          </div>
          <div className="flex -space-x-3">
            {['Rahul', 'Priya', 'Amit', 'Neha'].map((n, i) => (
              <div key={n} className="w-12 h-12 rounded-full border-2 border-teal-900 bg-white flex items-center justify-center text-teal-900 font-bold shadow-sm z-10 hover:z-20 transition-transform hover:scale-110" style={{ zIndex: 10 - i }}>
                {n[0]}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Group Members & Graph */}
        <div className="lg:col-span-7 flex flex-col gap-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Members Status */}
            <div className="rounded-3xl p-6 bg-white border border-gray-100 shadow-sm">
              <h3 className="font-extrabold text-lg text-gray-900 mb-5 flex items-center gap-2">
                <Users className="text-blue-500" /> Live Status
              </h3>
              <div className="flex flex-col gap-3">
                {members.map((m) => {
                  const isBroken = m.status === 'broken';
                  return (
                    <div key={m.memberId} className={`flex justify-between items-center p-3 rounded-2xl border ${isBroken ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-inner ${isBroken ? 'bg-red-500' : 'bg-blue-600'}`}>
                          {m.name[0]}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-gray-900 flex items-center gap-2">
                            {m.name}
                            {isBroken && <span className="text-[9px] uppercase font-black tracking-widest px-2 py-0.5 rounded-full bg-red-100 text-red-700">Weakest Link</span>}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5 max-w-[120px] truncate">{m.currentLeg}</div>
                        </div>
                      </div>
                      <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${isBroken ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Shared Nodes */}
            <div className="rounded-3xl p-6 bg-white border border-gray-100 shadow-sm">
              <h3 className="font-extrabold text-lg text-gray-900 mb-5 flex items-center gap-2">
                <MapPin className="text-emerald-500" /> Meetup Points
              </h3>
              <div className="flex flex-col gap-4">
                {sharedNodesList.map((sn, i) => (
                  <div key={sn.nodeId} className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100/50 relative overflow-hidden group">
                    <div className="absolute left-0 top-0 w-1 h-full bg-emerald-400" />
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 text-emerald-600 font-bold shadow-inner">
                      {i + 1}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">{sn.label}</div>
                      <div className="text-xs text-emerald-600/80 font-semibold mt-1">{sn.sharedByCount} travelers converging here</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* DAG Canvas */}
          <div className="rounded-3xl bg-white border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-extrabold text-lg text-gray-900 flex items-center gap-2">
                Group Sync Graph <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] uppercase tracking-wider font-black">Live</span>
              </h3>
              <div className="text-xs text-gray-500 font-medium flex items-center gap-1.5">
                <Clock size={12} /> Syncing telemetry...
              </div>
            </div>
            <div className="p-2 relative">
               <div className="absolute inset-0 bg-red-500/5 z-0 pointer-events-none" />
               <DependencyGraph nodes={nodes} edges={edges} tripId={tripId} />
            </div>
          </div>
        </div>

        {/* Right Column: Simulation & Disruption */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="rounded-3xl bg-red-50/30 border border-red-100 overflow-hidden shadow-sm">
             <div className="p-1">
                {/* We pass our fake simulation result as initialResult to bypass the API fetch */}
                <CascadeImpactPanel tripId={tripId} initialResult={demoSimulation as any} />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
