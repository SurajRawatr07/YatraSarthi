"use client";

import { useState, useCallback, useEffect } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { AuthFlowModal } from '../components/auth/AuthFlowModal';
import { Navbar } from '../components/Navbar';
import { BottomNav } from '../components/BottomNav';
import { Hero } from '../components/Hero';
import { TripControlCenter } from '../components/TripControlCenter';
import { MyTrips } from '../components/MyTrips';
import { CreateTrip } from '../components/CreateTrip';
import { GroupJourney } from '../components/GroupJourney';
import { SurakshaPanel } from '../components/SurakshaPanel';
import { UserDashboard } from '../components/UserDashboard';
import { Footer } from '../components/Footer';
import { DigitalTwinScreen } from '../components/DigitalTwinScreen';
import { NugenPanel } from '../components/NugenPanel';
import type { TripData } from '../types';

type Page = 'home' | 'dashboard' | 'trips' | 'recovery' | 'group' | 'suraksha' | 'new-trip' | 'digital-twin' | 'assistant';

function MainApp() {
  const [page, setPage] = useState<Page>('home');
  const [activeTrip, setActiveTrip] = useState<TripData | null>(null);
  const [trips, setTrips] = useState<TripData[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchTrips = useCallback(() => {
    setLoading(true);
    fetch('/api/trips')
      .then(r => r.json())
      .then(data => {
        if (data.data?.trips) {
          setTrips(data.data.trips);
          if (!activeTrip && data.data.trips.length > 0) {
            setActiveTrip(data.data.trips[0]);
          }
        } else if (Array.isArray(data.trips)) {
          setTrips(data.trips);
          if (!activeTrip && data.trips.length > 0) {
            setActiveTrip(data.trips[0]);
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [activeTrip]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const navigate = useCallback((p: string) => {
    setPage(p as Page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSelectTrip = (id: string) => {
    const trip = trips.find(t => t.id === id);
    if (trip) {
      setActiveTrip(trip);
      navigate('recovery');
    }
  };

  const handleTripCreated = useCallback(() => {
    fetchTrips();
  }, [fetchTrips]);

  const handleTripCreatedWithData = useCallback((newTrip: TripData) => {
    setActiveTrip(newTrip);
  }, []);

  const handleDisrupt = useCallback((scenarioId: string) => {
    if (!activeTrip) return;
    
    // Fire real endpoint
    const affectedNodeId = activeTrip.nodes?.[0]?.id || 'unknown';
    fetch('/api/disruptions/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tripId: activeTrip.id,
        nodeId: affectedNodeId,
        delayMin: 120,
        source: 'user_reported'
      })
    }).then(() => {
      // Trigger a re-fetch of the active trip
      fetch(`/api/trips/${activeTrip.id}/graph`)
        .then(r => r.json())
        .then(data => {
          if (data.status) {
            setActiveTrip(prev => prev ? { ...prev, ...data } : prev);
          }
        });
    });
  }, [activeTrip]);

  const showFooter = page === 'home' || page === 'dashboard';

  return (
    <div style={{ background: '#F5F2E8', fontFamily: "'Plus Jakarta Sans', sans-serif", minHeight: '100vh', color: '#172017' }}>
      <AuthFlowModal />
      <Navbar activePage={page} onNavigate={navigate} />

      <main>
        {page === 'home' && <Hero onNavigate={navigate} />}

        {page === 'dashboard' && (
          <UserDashboard 
            trips={trips} 
            activeTrip={activeTrip || trips[0]} 
            onSelectTrip={handleSelectTrip} 
            onNavigate={navigate}
            user={user}
          />
        )}

        {page === 'trips' && (
          <MyTrips
            trips={trips}
            loading={loading}
            onSelectTrip={handleSelectTrip}
            onNavigate={navigate}
            onRefreshTrips={fetchTrips}
          />
        )}

        {page === 'recovery' && activeTrip && (
          <TripControlCenter trip={activeTrip} onDisrupt={handleDisrupt} />
        )}

        {page === 'group' && activeTrip && <GroupJourney tripId={activeTrip.id} />}

        {page === 'suraksha' && <SurakshaPanel trip={activeTrip} />}

        {page === 'digital-twin' && (
          <DigitalTwinScreen
            trip={activeTrip}
            allTrips={trips}
            onSelectTrip={handleSelectTrip}
          />
        )}

        {page === 'assistant' && (
          <div className="max-w-4xl mx-auto px-4 pt-8 pb-16">
            <NugenPanel />
          </div>
        )}

        {page === 'new-trip' && (
          <CreateTrip
            onNavigate={navigate}
            onTripCreated={handleTripCreated}
            onTripCreatedWithData={handleTripCreatedWithData}
          />
        )}
      </main>

      {showFooter && <Footer onNavigate={navigate} />}

      <BottomNav activePage={page} onNavigate={navigate} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
