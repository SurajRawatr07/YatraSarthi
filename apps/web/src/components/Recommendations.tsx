import { useState, useEffect } from 'react';
import { Zap, Check, X, Info } from 'lucide-react';

type Tab = 'flights' | 'hotels';

export function Recommendations() {
  const [activeTab, setActiveTab] = useState<Tab>('flights');
  // For the moment, we just render an empty state or generic suggestions since API isn't built.
  // In a real app, this would fetch from /api/routing/estimate or a flight/hotel aggregator.

  return (
    <div className="card p-6" style={{ background: '#FFFFFF', borderColor: '#D5D9CC' }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-bold" style={{ color: '#172017' }}>Smart recommendations</h3>
          <p className="text-sm mt-0.5" style={{ color: '#5F665B' }}>Based on your group's overall schedule</p>
        </div>
        <div className="text-xs px-2.5 py-1.5 rounded-full font-semibold flex items-center gap-1.5" style={{ background: '#EDE9D8', color: '#172017', border: '1px solid #D5D9CC' }}>
          <Zap size={13} style={{ color: '#172017', fill: '#C5D82D' }} />
          Auto-optimizing
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('flights')}
          className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all"
          style={{ background: activeTab === 'flights' ? '#172017' : '#EDE9D8', color: activeTab === 'flights' ? '#F5F2E8' : '#5F665B' }}
        >
          Flights
        </button>
        <button
          onClick={() => setActiveTab('hotels')}
          className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all"
          style={{ background: activeTab === 'hotels' ? '#172017' : '#EDE9D8', color: activeTab === 'hotels' ? '#F5F2E8' : '#5F665B' }}
        >
          Hotels
        </button>
      </div>

      <div className="text-sm py-8 text-center border-2 border-dashed rounded-xl" style={{ borderColor: '#D5D9CC', color: '#858B80', background: '#F5F2E8' }}>
        Live recommendations fetching from real providers will appear here once connected.
      </div>
    </div>
  );
}
