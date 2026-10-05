import { useState } from 'react';
import { ArrowRight, ArrowLeft, Plus, Trash2, Check, Upload, FileText, Sparkles, RefreshCw, AlertCircle, User, Users, Compass, ShieldCheck } from 'lucide-react';
import { Recommendations } from './Recommendations';

interface CreateTripProps {
  onNavigate: (page: string) => void;
  onTripCreated: () => void;
  onTripCreatedWithData?: (trip: any) => void;
}

type Mode = 'quick' | 'scratch' | 'import';
type CreateStep = 1 | 2 | 3 | 4 | 5 | 6;

export function CreateTrip({ onNavigate, onTripCreated, onTripCreatedWithData }: CreateTripProps) {
  const [mode, setMode] = useState<Mode>('quick');

  if (mode === 'quick') {
    return (
      <QuickCreateTrip
        onNavigate={onNavigate}
        onTripCreated={onTripCreated}
        onTripCreatedWithData={onTripCreatedWithData}
        onSwitchMode={setMode}
      />
    );
  }

  if (mode === 'scratch') {
    return (
      <CreateFromScratch
        onNavigate={onNavigate}
        onTripCreated={onTripCreated}
        onTripCreatedWithData={onTripCreatedWithData}
        onBack={() => setMode('quick')}
      />
    );
  }

  return (
    <ImportFlow
      onNavigate={onNavigate}
      onTripCreated={onTripCreated}
      onTripCreatedWithData={onTripCreatedWithData}
      onBack={() => setMode('quick')}
    />
  );
}

/* ─────────────────────────────────────────────────────────────
   B2: MINIMAL QUICK CREATE TRIP (PER UI SPECIFICATION)
───────────────────────────────────────────────────────────── */
function QuickCreateTrip({
  onNavigate,
  onTripCreated,
  onTripCreatedWithData,
  onSwitchMode,
}: {
  onNavigate: (p: string) => void;
  onTripCreated: () => void;
  onTripCreatedWithData?: (trip: any) => void;
  onSwitchMode: (m: Mode) => void;
}) {
  const [travelStyle, setTravelStyle] = useState<'solo' | 'group'>('solo');
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('Goa');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim()) return;

    setLoading(true);
    setError(null);

    const tripName = name.trim() || (travelStyle === 'solo' ? `${destination} Solo Journey` : `${destination} with the gang`);

    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tripName,
          destination: destination.trim(),
          startDate,
          endDate,
          tripType: travelStyle,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to create trip');
      }

      onTripCreated();
      if (onTripCreatedWithData) {
        onTripCreatedWithData(data.data);
      }
      onNavigate('recovery');
    } catch (err: any) {
      setError(err.message || 'Error creating trip');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 md:pb-8 flex items-center justify-center px-5" style={{ background: '#F5F2E8' }}>
      <div className="w-full max-w-xl">
        <div className="text-center mb-8">
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider mb-3 inline-block"
            style={{ background: '#DCE8D2', color: '#172017' }}
          >
            B2 — Create Trip
          </span>
          <h1
            className="font-extrabold mb-2 text-3xl sm:text-4xl text-[#172017]"
            style={{ letterSpacing: '-0.02em' }}
          >
            Start your connected trip
          </h1>
          <p className="text-sm text-[#5F665B]">
            Set up the itinerary foundation. We will generate your Kutumb code immediately.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-2xl mb-6 bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="card p-6 sm:p-8 bg-white border border-[#D5D9CC] shadow-xl rounded-3xl">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Travel Style Selector (Solo vs Group) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-[#5F665B]">
                Travel Style
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTravelStyle('solo')}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                    travelStyle === 'solo'
                      ? 'bg-[#172017] text-[#F5F2E8] border-[#172017] shadow-md'
                      : 'bg-[#F5F2E8]/60 text-[#172017] border-[#D5D9CC] hover:bg-white'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      travelStyle === 'solo' ? 'bg-[#C5D82D] text-[#172017]' : 'bg-[#DCE8D2] text-[#172017]'
                    }`}
                  >
                    <Compass size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-bold flex items-center gap-1.5">
                      Solo Traveler
                      {travelStyle === 'solo' && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#C5D82D] text-[#172017] font-extrabold">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className={`text-[11px] mt-0.5 leading-snug ${travelStyle === 'solo' ? 'text-[#DCE8D2]' : 'text-[#5F665B]'}`}>
                      Suraksha SOS beacon, phantom micro-transit & personal buffers
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTravelStyle('group')}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                    travelStyle === 'group'
                      ? 'bg-[#172017] text-[#F5F2E8] border-[#172017] shadow-md'
                      : 'bg-[#F5F2E8]/60 text-[#172017] border-[#D5D9CC] hover:bg-white'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      travelStyle === 'group' ? 'bg-[#C5D82D] text-[#172017]' : 'bg-[#DCE8D2] text-[#172017]'
                    }`}
                  >
                    <Users size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-bold flex items-center gap-1.5">
                      Kutumb / Group
                      {travelStyle === 'group' && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#C5D82D] text-[#172017] font-extrabold">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className={`text-[11px] mt-0.5 leading-snug ${travelStyle === 'group' ? 'text-[#DCE8D2]' : 'text-[#5F665B]'}`}>
                      Multi-origin sync, Kutumb invite code & UPI split payments
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Trip Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-[#5F665B]">
                Trip Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={travelStyle === 'solo' ? 'e.g. Solo Backpacking in Himachal' : 'e.g. Goa with the gang'}
                className="w-full px-4 py-3.5 rounded-2xl bg-[#F5F2E8]/40 border border-[#D5D9CC] text-base font-semibold text-[#172017] outline-none focus:ring-2 focus:ring-[#C5D82D]"
                autoFocus
              />
              <span className="text-[11px] text-[#5F665B] mt-1.5 block">
                {travelStyle === 'solo'
                  ? 'Give your solo trip an adventure name. You can customize this anytime.'
                  : 'You can rename this later — group members will see this name.'}
              </span>
            </div>

            {/* Destination */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-[#5F665B]">
                Destination
              </label>
              <input
                type="text"
                value={destination}
                onChange={e => setDestination(e.target.value)}
                placeholder="e.g. Goa, Manali, Bengaluru"
                required
                className="w-full px-4 py-3.5 rounded-2xl bg-[#F5F2E8]/40 border border-[#D5D9CC] text-base font-semibold text-[#172017] outline-none focus:ring-2 focus:ring-[#C5D82D]"
              />
              <div className="flex gap-2 mt-2 flex-wrap">
                {['Goa', 'Manali', 'Mumbai', 'Jaipur', 'Varanasi', 'Kashmir'].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDestination(d)}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all"
                    style={{
                      background: destination === d ? '#DCE8D2' : '#EDE9D8',
                      color: destination === d ? '#172017' : '#5F665B',
                      border: destination === d ? '1px solid #172017' : '1px solid #D5D9CC',
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-[#5F665B]">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-2xl bg-[#F5F2E8]/40 border border-[#D5D9CC] text-xs font-semibold text-[#172017] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-[#5F665B]">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-2xl bg-[#F5F2E8]/40 border border-[#D5D9CC] text-xs font-semibold text-[#172017] outline-none"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !destination.trim()}
              className="btn-accent w-full py-4 text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer mt-2"
              style={{ opacity: loading ? 0.7 : 1 }}
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Creating Trip in Database...
                </>
              ) : travelStyle === 'solo' ? (
                <>
                  Create Solo Trip & Activate Suraksha <ShieldCheck size={16} />
                </>
              ) : (
                <>
                  Create Trip & Generate Kutumb Code <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Alternate Flows */}
          <div className="mt-8 pt-6 border-t border-[#D5D9CC] flex items-center justify-between text-xs text-[#5F665B]">
            <span>Need advanced assistance?</span>
            <div className="flex gap-3">
              <button
                onClick={() => onSwitchMode('scratch')}
                className="font-bold text-[#172017] hover:underline cursor-pointer"
              >
                Detailed Planner →
              </button>
              <span>·</span>
              <button
                onClick={() => onSwitchMode('import')}
                className="font-bold text-[#4E8752] hover:underline cursor-pointer"
              >
                Import Tickets →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   DETAILED PLANNER FLOW (Connected to Real DB API)
───────────────────────────────────────────────────────────── */
function CreateFromScratch({
  onNavigate,
  onTripCreated,
  onTripCreatedWithData,
  onBack,
}: {
  onNavigate: (p: string) => void;
  onTripCreated: () => void;
  onTripCreatedWithData?: (trip: any) => void;
  onBack: () => void;
}) {
  const [step, setStep] = useState<CreateStep>(1);
  const [destination, setDestination] = useState('Goa');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [travelers, setTravelers] = useState<{ name: string; origin: string; mode: string }[]>([
    { name: 'Traveler 1', origin: 'Mumbai', mode: 'flight' },
  ]);
  const [loading, setLoading] = useState(false);

  const handleSaveAndCreate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${destination} Trip`,
          destination,
          startDate,
          endDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to create trip');

      onTripCreated();
      if (onTripCreatedWithData) onTripCreatedWithData(data.data);
      onNavigate('recovery');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 md:pb-8" style={{ background: '#F5F2E8' }}>
      <div className="max-w-2xl mx-auto px-5 sm:px-8 py-8">
        <button onClick={onBack} className="btn-ghost text-sm mb-6 flex items-center gap-1.5 cursor-pointer text-[#172017]">
          <ArrowLeft size={16} /> Back to Quick Create
        </button>

        <div className="card p-8 bg-white border border-[#D5D9CC] rounded-3xl shadow-md">
          <h2 className="font-extrabold text-2xl text-[#172017] mb-2">Detailed Group Itinerary</h2>
          <p className="text-sm text-[#5F665B] mb-6">Plan routes, member start cities, and transport modes.</p>

          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-[#5F665B]">Destination</label>
              <input
                type="text"
                value={destination}
                onChange={e => setDestination(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#D5D9CC] font-semibold text-sm outline-none focus:ring-2 focus:ring-[#C5D82D]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-[#5F665B]">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#D5D9CC] text-xs font-semibold text-[#172017]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-[#5F665B]">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#D5D9CC] text-xs font-semibold text-[#172017]"
                />
              </div>
            </div>

            <button
              onClick={handleSaveAndCreate}
              disabled={loading}
              className="btn-accent py-3.5 text-sm font-bold mt-4 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              {loading ? 'Saving...' : 'Save & Build Graph →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   IMPORT FLOW (Connected to Real DB API)
───────────────────────────────────────────────────────────── */
function ImportFlow({
  onNavigate,
  onTripCreated,
  onTripCreatedWithData,
  onBack,
}: {
  onNavigate: (p: string) => void;
  onTripCreated: () => void;
  onTripCreatedWithData?: (trip: any) => void;
  onBack: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleSaveImportedTrip = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Goa Holiday (Imported)',
          destination: 'Goa',
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to create trip');

      onTripCreated();
      if (onTripCreatedWithData) onTripCreatedWithData(data.data);
      onNavigate('recovery');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 md:pb-8 flex items-center justify-center px-5" style={{ background: '#F5F2E8' }}>
      <div className="max-w-xl w-full">
        <button onClick={onBack} className="btn-ghost text-sm mb-6 flex items-center gap-1.5 cursor-pointer text-[#172017]">
          <ArrowLeft size={16} /> Back to Quick Create
        </button>

        <div className="card p-8 bg-white border border-[#D5D9CC] rounded-3xl shadow-xl">
          <h2 className="font-extrabold text-2xl text-[#172017] mb-2">Import Bookings</h2>
          <p className="text-sm text-[#5F665B] mb-6">
            Upload flight, train, or hotel receipts. YatraSarthi will extract them and initiate the trip.
          </p>

          <div
            className="p-8 rounded-2xl border-2 border-dashed border-[#D5D9CC] flex flex-col items-center justify-center gap-3 mb-6 bg-[#EDE9D8]/50"
          >
            <Upload size={32} className="text-[#172017]" />
            <span className="text-sm font-semibold text-[#172017]">Drop booking PDF, PNG, or tickets here</span>
            <span className="text-xs text-[#5F665B]">Supports Indigo, Air India, IRCTC, MakeMyTrip</span>
          </div>

          <button
            onClick={handleSaveImportedTrip}
            disabled={loading}
            className="btn-accent w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            {loading ? 'Saving Imported Trip...' : 'Confirm & Save Trip →'}
          </button>
        </div>
      </div>
    </div>
  );
}
