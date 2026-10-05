import { useState } from 'react';
import { 
  Plus, ArrowRight, MapPin, Users, ChevronRight, 
  AlertTriangle, Share2, Settings, ShieldAlert, Sparkles, UserPlus, Compass 
} from 'lucide-react';
import type { TripData } from '../types';
import { KutumbInviteModal } from './trips/KutumbInviteModal';
import { TripSettingsModal } from './trips/TripSettingsModal';
import { JoinTripModal } from './trips/JoinTripModal';

interface MyTripsProps {
  trips: TripData[];
  loading?: boolean;
  onSelectTrip: (id: string) => void;
  onNavigate: (page: string) => void;
  onRefreshTrips?: () => void;
}

export function MyTrips({ trips, loading = false, onSelectTrip, onNavigate, onRefreshTrips }: MyTripsProps) {
  const [selectedInviteTrip, setSelectedInviteTrip] = useState<TripData | null>(null);
  const [selectedSettingsTrip, setSelectedSettingsTrip] = useState<TripData | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');

  const today = new Date().toISOString().split('T')[0];
  const activeTrips = trips.filter(t => !t.endDate || t.endDate >= today);
  const pastTrips = trips.filter(t => t.endDate && t.endDate < today);

  const displayedTrips = activeTab === 'active' ? activeTrips : pastTrips;

  // Find any trip requiring immediate attention per B1 specification
  const unhealthyTrip = trips.find(
    t => t.status === 'needs_attention' || t.status === 'unhealthy' || (t.healthScore !== undefined && t.healthScore < 60)
  );

  return (
    <div className="min-h-screen pb-20 md:pb-8" style={{ background: '#F5F2E8' }}>
      {/* Top Banner & Header */}
      <div style={{ background: '#EDE9D8', borderBottom: '1px solid #D5D9CC', padding: '32px 0 28px' }}>
        <div className="max-w-5xl mx-auto px-5 sm:px-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-extrabold text-3xl mb-1 text-[#172017]" style={{ letterSpacing: '-0.02em' }}>
              My Trips
            </h1>
            <p style={{ color: '#5F665B' }}>
              {trips.length} saved {trips.length === 1 ? 'trip' : 'trips'} · YatraSarthi keeps them connected
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowJoinModal(true)}
              className="btn-ghost flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#D5D9CC] text-xs font-bold text-[#172017] hover:bg-white transition-all cursor-pointer shadow-sm"
            >
              <UserPlus size={15} style={{ color: '#172017' }} />
              <span>Join with Code</span>
            </button>

            <button
              onClick={() => onNavigate('new-trip')}
              className="btn-accent px-5 py-2.5 text-sm flex items-center gap-1.5 cursor-pointer shadow-sm font-bold"
            >
              <Plus size={16} />
              <span>New trip</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8">
        {/* B1: SPEC-MANDATED "NEEDS ATTENTION" STATUS BANNER */}
        {unhealthyTrip && (
          <div
            className="mb-8 p-4 sm:p-5 rounded-2xl flex items-center justify-between gap-4 shadow-md animate-slide-up"
            style={{
              background: '#FDF2F1',
              border: '1px solid #F5C6C2',
              color: '#B03028',
            }}
          >
            <div className="flex items-start gap-3.5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: '#FCE4E2' }}
              >
                <ShieldAlert size={22} className="text-[#D93829]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm uppercase tracking-wider text-[#D93829]">
                    {unhealthyTrip.status === 'unhealthy' ? 'Unhealthy' : 'Needs Attention'}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-[#FCE4E2] font-semibold text-[#B03028]">
                    {unhealthyTrip.name || unhealthyTrip.destination}
                  </span>
                </div>
                <p className="text-xs sm:text-sm mt-1 text-[#78231E]">
                  {unhealthyTrip.weakestEdge
                    ? `Potential break on ${unhealthyTrip.weakestEdge.label} (${Math.round(unhealthyTrip.weakestEdge.missChance * 100)}% risk). Review cascade options now.`
                    : 'A booking in this trip has reported delay risks. Take action before downstream bookings are affected.'}
                </p>
              </div>
            </div>

            <button
              onClick={() => onSelectTrip(unhealthyTrip.id)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#D93829] hover:bg-[#b52a1d] transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer shadow-sm"
            >
              Review Impact <ChevronRight size={14} />
            </button>
          </div>
        )}

        {/* Tab Switcher & Persistence note */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('active')}
              className="px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
              style={{
                background: activeTab === 'active' ? '#172017' : '#DCE8D2',
                color: activeTab === 'active' ? '#F5F2E8' : '#172017',
              }}
            >
              Upcoming & Active ({activeTrips.length})
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className="px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
              style={{
                background: activeTab === 'past' ? '#172017' : '#DCE8D2',
                color: activeTab === 'past' ? '#F5F2E8' : '#172017',
              }}
            >
              Past Trips ({pastTrips.length})
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs p-2.5 rounded-xl border border-[#D5D9CC]" style={{ background: '#E8F0E2', color: '#4E8752' }}>
            <span>✓</span>
            <span className="font-medium">Your itineraries are saved. YatraSarthi monitors delay cascades continuously.</span>
          </div>
        </div>

        {/* Rich Loading Skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[1, 2].map(i => (
              <div
                key={i}
                className="p-6 rounded-3xl bg-white border border-[#D5D9CC] shadow-sm animate-pulse flex flex-col justify-between h-64"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-6 w-40 bg-[#EDE9D8] rounded-lg" />
                    <div className="h-6 w-20 bg-[#EDE9D8] rounded-full" />
                  </div>
                  <div className="h-4 w-32 bg-[#F5F2E8] rounded mb-5" />
                  <div className="h-2 w-full bg-[#F5F2E8] rounded-full mb-3" />
                  <div className="flex gap-2 mb-4">
                    <div className="h-7 w-20 bg-[#EDE9D8] rounded-lg" />
                    <div className="h-7 w-20 bg-[#EDE9D8] rounded-lg" />
                  </div>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-[#D5D9CC]">
                  <div className="h-4 w-24 bg-[#F5F2E8] rounded" />
                  <div className="h-4 w-16 bg-[#EDE9D8] rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* B1: Contextual Spec Empty State */}
        {!loading && displayedTrips.length === 0 && (
          <div
            className="p-12 sm:p-16 rounded-3xl bg-white border text-center flex flex-col items-center justify-center max-w-xl mx-auto shadow-sm my-6 animate-scale-up"
            style={{ borderColor: '#D5D9CC' }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: '#DCE8D2' }}
            >
              <Sparkles size={28} style={{ color: '#172017' }} />
            </div>
            <h2 className="font-extrabold text-2xl text-[#172017] mb-2" style={{ letterSpacing: '-0.02em' }}>
              {activeTab === 'past' ? 'No past trips' : 'No trips yet'}
            </h2>
            <p className="text-sm text-[#5F665B] mb-6 max-w-sm leading-relaxed">
              {activeTab === 'past'
                ? 'Your completed journeys and history will appear here once trips conclude.'
                : 'No trips yet — add your first booking and we\'ll start building the plan.'}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onNavigate('new-trip')}
                className="btn-accent px-6 py-3 text-sm font-bold flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <Plus size={16} /> New trip
              </button>
              <button
                onClick={() => setShowJoinModal(true)}
                className="btn-secondary px-5 py-3 text-sm font-bold cursor-pointer"
              >
                Join with code
              </button>
            </div>
          </div>
        )}

        {/* Trips Grid */}
        {!loading && displayedTrips.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {displayedTrips.map(trip => (
              <TripCard
                key={trip.id}
                trip={trip}
                onSelect={() => onSelectTrip(trip.id)}
                onOpenInvite={() => setSelectedInviteTrip(trip)}
                onOpenSettings={() => setSelectedSettingsTrip(trip)}
              />
            ))}

            {/* New trip CTA card */}
            <button
              onClick={() => onNavigate('new-trip')}
              className="rounded-3xl p-8 flex flex-col items-center justify-center gap-3 transition-all hover:shadow-md group cursor-pointer bg-white/40"
              style={{ border: '2px dashed #D5D9CC', minHeight: 220 }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 shadow-sm"
                style={{ background: '#DCE8D2' }}
              >
                <Plus size={22} style={{ color: '#172017' }} />
              </div>
              <span className="font-bold text-sm text-[#5F665B] group-hover:text-[#172017]">
                Plan another trip
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Screen B3: Kutumb Invite Modal */}
      {selectedInviteTrip && (
        <KutumbInviteModal
          trip={selectedInviteTrip}
          isOpen={!!selectedInviteTrip}
          onClose={() => setSelectedInviteTrip(null)}
          onTripUpdated={onRefreshTrips}
        />
      )}

      {/* Screen B4: Trip Settings Modal */}
      {selectedSettingsTrip && (
        <TripSettingsModal
          trip={selectedSettingsTrip}
          isOpen={!!selectedSettingsTrip}
          onClose={() => setSelectedSettingsTrip(null)}
          onTripUpdated={() => {
            if (onRefreshTrips) onRefreshTrips();
          }}
          onOpenInvite={() => {
            setSelectedInviteTrip(selectedSettingsTrip);
          }}
        />
      )}

      {/* Join Trip with Code Modal */}
      {showJoinModal && (
        <JoinTripModal
          isOpen={showJoinModal}
          onClose={() => setShowJoinModal(false)}
          onSuccess={(joinedTripId) => {
            if (onRefreshTrips) onRefreshTrips();
            onSelectTrip(joinedTripId);
          }}
        />
      )}
    </div>
  );
}

function TripCard({
  trip,
  onSelect,
  onOpenInvite,
  onOpenSettings,
}: {
  trip: TripData;
  onSelect: () => void;
  onOpenInvite: () => void;
  onOpenSettings: () => void;
}) {
  const healthColor =
    trip.health >= 80 ? '#62A86B' : trip.health >= 60 ? '#E5A43F' : '#E45B4D';
  const statusLabel =
    trip.status === 'healthy'
      ? 'Healthy'
      : trip.status === 'needs_attention'
      ? 'Needs Attention'
      : trip.status === 'unhealthy'
      ? 'Unhealthy'
      : trip.status === 'resolving'
      ? 'Resolving'
      : 'Completed';
  const isDisrupted = trip.status === 'needs_attention' || trip.health < 60;
  const isSolo = trip.tripType === 'solo' || (!trip.tripType && (trip.travellers?.length === 1 || trip.memberIds?.length === 1));
  const nextNode = trip.nodes?.[0];

  const typeIcons: Record<string, string> = {
    flight: '✈',
    train: '🚆',
    bus: '🚌',
    cab: '🚕',
    hotel: '🏨',
    activity: '🏝',
    phantom: '📍',
  };

  return (
    <div
      onClick={onSelect}
      className="card p-6 text-left transition-all hover:shadow-xl hover:-translate-y-1 rounded-3xl bg-white flex flex-col justify-between cursor-pointer group"
      style={{
        border: isDisrupted ? '1px solid #EFAAA5' : '1px solid #D5D9CC',
      }}
    >
      <div>
        {/* Header & Status */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-2 mb-1">
              <h3
                className="font-extrabold text-xl truncate text-[#172017]"
                style={{ letterSpacing: '-0.01em' }}
              >
                {trip.name || trip.destination}
              </h3>
              {isSolo ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#DCE8D2] text-[#172017] border border-[#172017]/10 flex items-center gap-1 flex-shrink-0">
                  <Compass size={10} className="text-[#4E8752]" /> Solo
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EDE9D8] text-[#5F665B] border border-[#D5D9CC] flex items-center gap-1 flex-shrink-0">
                  <Users size={10} /> Kutumb
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#5F665B]">
              <MapPin size={12} className="text-[#172017]" />
              <span>
                {trip.startDate} – {trip.endDate}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <div
              className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
              style={{
                background: isDisrupted ? '#FDECEA' : '#E8F0E2',
                color: isDisrupted ? '#B03028' : '#2D7836',
                border: `1px solid ${isDisrupted ? '#EFAAA5' : '#D5D9CC'}`,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: healthColor }} />
              {statusLabel}
            </div>

            {/* Quick Actions: Kutumb & Settings */}
            <button
              onClick={e => { e.stopPropagation(); onOpenInvite(); }}
              className="p-1.5 rounded-xl hover:bg-[#DCE8D2] text-[#5F665B] hover:text-[#172017] transition-colors cursor-pointer"
              title={isSolo ? "Share Live Tracking" : "Kutumb Invite Link"}
            >
              <Share2 size={15} />
            </button>

            <button
              onClick={e => { e.stopPropagation(); onOpenSettings(); }}
              className="p-1.5 rounded-xl hover:bg-[#DCE8D2] text-[#5F665B] hover:text-[#172017] transition-colors cursor-pointer"
              title="Trip Settings"
            >
              <Settings size={15} />
            </button>
          </div>
        </div>

        {/* Health bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-xs text-[#5F665B]">
              {isSolo ? (
                <>
                  <Compass size={12} className="text-[#4E8752]" />
                  <span className="font-semibold text-[#172017]">Solo Traveler · Suraksha Active</span>
                </>
              ) : (
                <>
                  <Users size={12} />
                  <span>{trip.travellers?.length || 1} Kutumb members</span>
                </>
              )}
            </div>
            <span className="font-extrabold text-base" style={{ color: healthColor, letterSpacing: '-0.02em' }}>
              {trip.health}
              <span className="text-xs font-normal text-gray-400">/100</span>
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden bg-gray-100">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${trip.health}%`, background: healthColor }}
            />
          </div>
        </div>

        {/* Node strip */}
        <div className="flex gap-1.5 flex-wrap mb-4 min-h-[28px]">
          {trip.nodes && trip.nodes.length > 0 ? (
            trip.nodes.slice(0, 4).map(node => {
              const nodeColor =
                node.status === 'confirmed' || node.status === 'on_track'
                  ? '#4E8752'
                  : node.status === 'broken'
                  ? '#D93829'
                  : '#8D6E1A';
              return (
                <div
                  key={node.id}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] bg-[#EDE9D8]/50 border"
                  style={{ borderColor: `${nodeColor}40` }}
                >
                  <span style={{ fontSize: 11 }}>{typeIcons[node.type] || '📌'}</span>
                  <span className="truncate max-w-[80px] font-medium text-[#172017]">{typeof node.label === 'object' ? (node.label as any)?.value ?? node.type : node.label}</span>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: nodeColor }} />
                </div>
              );
            })
          ) : (
            <div className="text-[11px] text-[#858B80] italic">No bookings added yet</div>
          )}
        </div>
      </div>

      {/* Bottom Footer Action */}
      <div className="flex items-center justify-between pt-3 border-t border-[#D5D9CC] mt-2">
        <span className="text-[11px] font-mono text-[#5F665B] tracking-wider uppercase font-semibold">
          CODE: {trip.joinCode || 'PENDING'}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          className="flex items-center gap-1 text-xs font-bold text-[#172017] transition-all cursor-pointer group-hover:text-[#C5D82D] group-hover:gap-2"
        >
          Open trip <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
