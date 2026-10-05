import { useState } from 'react';
import { 
  Shield, CheckCircle2, 
  CreditCard, FileText, 
  Users, Check, Phone, Calendar
} from 'lucide-react';
import type { TripData } from '../types';
import { User } from '@yatrasarthi/types';

interface UserDashboardProps {
  trips: TripData[];
  activeTrip: TripData;
  onSelectTrip: (id: string) => void;
  onNavigate: (page: string) => void;
  user?: User | null;
}

export function UserDashboard({ trips, activeTrip, onSelectTrip, onNavigate, user }: UserDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'dgca' | 'payments' | 'vault' | 'settings'>('overview');
  
  const displayName = user?.name || (user?.phone ? `Traveler (${user.phone})` : 'Traveler');
  const initial = displayName ? displayName[0].toUpperCase() : 'T';

  return (
    <div className="min-h-screen pb-24 md:pb-12" style={{ background: '#F5F2E8' }}>
      <div style={{ background: '#EDE9D8', borderBottom: '1px solid #D5D9CC', paddingTop: '2rem', paddingBottom: '1.5rem' }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-md relative"
                style={{ background: '#172017', color: '#C5D82D' }}
              >
                {initial}
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#4E8752] border-2 border-white flex items-center justify-center">
                  <Check size={12} strokeWidth={3} className="text-white" />
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-extrabold" style={{ color: '#172017', letterSpacing: '-0.02em' }}>
                  {displayName}
                </h1>
                <p className="text-sm font-medium mt-0.5 flex items-center gap-1.5" style={{ color: '#5F665B' }}>
                  <Shield size={14} style={{ color: '#4E8752' }} />
                  {user?.subscription?.tier === 'pro' ? 'YatraSarthi Pro Member' : 'YatraSarthi Member'}
                  {user?.phone && <span className="text-xs text-[#858B80]">· {user.phone}</span>}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-6 mt-8 overflow-x-auto no-scrollbar border-b border-[#D5D9CC]">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'dgca', label: 'DGCA Rights' },
              { id: 'payments', label: 'Split Payments' },
              { id: 'vault', label: 'Document Vault' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className="pb-3 text-sm font-semibold transition-all whitespace-nowrap cursor-pointer"
                style={{
                  color: activeTab === tab.id ? '#172017' : '#5F665B',
                  borderBottom: activeTab === tab.id ? '2px solid #C5D82D' : '2px solid transparent'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="py-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="p-6 rounded-2xl bg-white border border-[#D5D9CC] shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#5F665B] mb-1">Total Trips</div>
                <div className="text-3xl font-extrabold text-[#172017]">{trips.length}</div>
                <div className="text-xs text-[#4E8752] mt-2 flex items-center gap-1">
                  <span>✓ Continuous cascade monitoring active</span>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-white border border-[#D5D9CC] shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#5F665B] mb-1">Account Status</div>
                <div className="text-3xl font-extrabold text-[#172017]">
                  {user ? 'Verified' : 'Guest'}
                </div>
                <div className="text-xs text-[#5F665B] mt-2">
                  Twilio Verify Phone OTP Authentication
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-white border border-[#D5D9CC] shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#5F665B] mb-1">Suraksha Safety</div>
                <div className="text-3xl font-extrabold text-[#4E8752]">Protected</div>
                <div className="text-xs text-[#5F665B] mt-2">
                  Emergency contacts: {user?.emergencyContacts?.length || 0} configured
                </div>
              </div>
            </div>

            <div className="text-center py-6 text-gray-500">
              <button
                onClick={() => onNavigate('trips')}
                className="btn-primary px-6 py-2.5 text-sm"
              >
                View all trips →
              </button>
            </div>
          </div>
        )}
        {activeTab === 'dgca' && <div className="text-center py-12 text-gray-500">DGCA Compensation Data will appear here once connected to APIs.</div>}
        {activeTab === 'payments' && <div className="text-center py-12 text-gray-500">Payment splits will appear here. No mock data.</div>}
        {activeTab === 'vault' && <div className="text-center py-12 text-gray-500">Document vault is empty.</div>}
      </div>
    </div>
  );
}
