'use client';


import { useEffect, useState, useCallback } from 'react';
import type { Node } from '@yatrasarthi/types';
import UploadDocument from './UploadDocument';
import ExtractionReview from './ExtractionReview';
import AddPhantomNode from './AddPhantomNode';
import BookingDetail from './BookingDetail';
import WhatsAppSetup from './WhatsAppSetup';
import { MessageCircle, FileText, FileEdit, Map, FolderOpen, Plane, Train, Bus, Car, Hotel, User, MapPin } from 'lucide-react';

type View = 'hub' | 'whatsapp' | 'upload' | 'review' | 'phantom' | 'detail';

interface IngestionHubProps {
  tripId: string;
  joinCode: string;
}

export default function IngestionHub({ tripId, joinCode }: IngestionHubProps) {
  const [view, setView] = useState<View>('hub');
  const [nodes, setNodes] = useState<Node[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [pendingNode, setPendingNode] = useState<Node | null>(null);


  const fetchNodes = useCallback(async () => {
    const res = await fetch(`/api/trips/${tripId}/nodes`);
    if (res.ok) {
      const json = await res.json();
      setNodes(json.data?.nodes ?? []);
    }
  }, [tripId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchNodes(); }, [fetchNodes]);

  // Called after upload — go to extraction review with the new pending node
  const onUploaded = (node: Node) => {
    setPendingNode(node);
    setView('review');
  };

  // Called after confirm — refresh list, back to hub
  const onConfirmed = () => {
    fetchNodes();
    setPendingNode(null);
    setView('hub');
  };

  if (view === 'whatsapp') return <WhatsAppSetup tripId={tripId} joinCode={joinCode} onBack={() => setView('hub')} />;
  if (view === 'upload') return <UploadDocument tripId={tripId} onUploaded={onUploaded} onBack={() => setView('hub')} />;
  if (view === 'review' && pendingNode) return <ExtractionReview node={pendingNode} onConfirmed={onConfirmed} onBack={() => setView('hub')} onPhantom={() => setView('phantom')} />;
  if (view === 'phantom') return <AddPhantomNode tripId={tripId} onAdded={onConfirmed} onBack={() => setView('hub')} />;
  if (view === 'detail' && selectedNode) return <BookingDetail nodeId={selectedNode.id} onBack={() => setView('hub')} onDeleted={onConfirmed} />;

  // Group nodes by date
  const grouped = nodes.reduce<Record<string, Node[]>>((acc, node) => {
    const date = node.time ? (isNaN(new Date(node.time).getTime()) ? String(node.time) : new Date(node.time).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })) : 'Unknown';
    (acc[date] ??= []).push(node);
    return acc;
  }, {});

  const statusTag: Record<string, { label: string; color: string }> = {
    pending_review: { label: 'Needs your review', color: '#f59e0b' },
    on_track:       { label: 'Confirmed',          color: '#22c55e' },
    at_risk:        { label: 'At risk',             color: '#f97316' },
    broken:         { label: 'Broken',              color: '#ef4444' },
    confirmed:      { label: 'Confirmed',           color: '#22c55e' },
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 font-sans">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-extrabold text-[#172017] tracking-tight">Add what you've booked</h2>
      </div>

      {/* Add options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {[
          { icon: <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp" className="w-10 h-10 drop-shadow-sm" />, label: 'Forward via WhatsApp', action: () => setView('whatsapp'), color: '#25D366' },
          { icon: <img src="https://img.icons8.com/color/96/add-file.png" alt="Upload" className="w-11 h-11 drop-shadow-sm" />, label: 'Upload a file or screenshot', action: () => setView('upload'), color: '#3B82F6' },
          { icon: <img src="https://img.icons8.com/color/96/two-tickets.png" alt="PNR" className="w-11 h-11 drop-shadow-sm" />, label: 'Paste an SMS / PNR', action: () => setView('upload'), color: '#F59E0B' },
          { icon: <img src="https://img.icons8.com/color/96/map-pin.png" alt="Map" className="w-11 h-11 drop-shadow-sm" />, label: 'Add a manual leg', action: () => setView('phantom'), color: '#8B5CF6' },
        ].map(({ icon, label, action, color }) => (
          <button 
            key={label} 
            onClick={action}
            className="group relative overflow-hidden flex flex-col items-center gap-3 p-6 rounded-2xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
            style={{ 
              background: 'linear-gradient(145deg, #FFFFFF 0%, #F9FAFB 100%)',
              border: '1px solid #E5E7EB',
            }}
          >
            {/* Ambient hover glow */}
            <div 
              className="absolute -inset-4 rounded-full blur-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-500"
              style={{ background: color }}
            />
            
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-110"
              style={{ background: '#FFFFFF', border: '1px solid #F3F4F6' }}
            >
              {icon}
            </div>
            <span className="text-sm font-semibold text-[#374151] text-center group-hover:text-[#172017] transition-colors">{label}</span>
          </button>
        ))}
      </div>

      {/* Node list */}
      {nodes.length === 0 ? (
        <div className="relative overflow-hidden p-10 rounded-2xl text-center border transition-all" style={{ background: 'linear-gradient(145deg, #F8FAFC 0%, #F1F5F9 100%)', borderColor: '#E2E8F0' }}>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#C5D82D] to-transparent opacity-50" />
          <div className="flex justify-center mb-4 text-[#C5D82D] drop-shadow-md">
             <FolderOpen size={48} strokeWidth={1.5} className="opacity-70" />
          </div>
          <p className="text-[#64748B] font-medium text-sm">Nothing added yet.<br/>Forward a booking email or upload a screenshot to get started.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.entries(grouped).map(([date, dateNodes]) => (
            <div key={date} className="flex flex-col gap-3">
              <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8] ml-2">{date}</p>
              {dateNodes.map(node => {
                const tag = statusTag[node.status] ?? { label: node.status, color: '#64748B' };
                return (
                  <button
                    key={node.id}
                    onClick={() => { setSelectedNode(node); setView('detail'); }}
                    className="group relative flex items-center gap-4 w-full p-4 rounded-2xl transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 text-left overflow-hidden"
                    style={{ background: 'linear-gradient(145deg, #FFFFFF 0%, #FDFDFD 100%)', border: '1px solid #E2E8F0' }}
                  >
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 transition-transform duration-300 group-hover:scale-110 shadow-sm"
                      style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
                    >
                      {nodeIcon(node)}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <span className="text-[15px] font-bold text-[#0F172A] truncate group-hover:text-[#172017] transition-colors">{typeof node.label === 'object' ? (node.label as any)?.value ?? node.type : node.label}</span>
                      <span className="text-xs font-medium text-[#64748B]">
                        {node.time ? (isNaN(new Date(node.time).getTime()) ? String(node.time) : new Date(node.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })) : 'Time pending'}
                      </span>
                    </div>
                    <span 
                      className="text-[11px] font-bold px-3 py-1 rounded-full shadow-sm whitespace-nowrap"
                      style={{ background: `${tag.color}15`, color: tag.color, border: `1px solid ${tag.color}30` }}
                    >
                      {tag.label}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function nodeIcon(node: Node) {
  const size = 20;
  const t = node.type;
  
  if (t === 'phantom' && node.label) {
    const l = node.label.toLowerCase();
    if (l.includes('train')) return <Train size={size} />;
    if (l.includes('auto') || l.includes('cab')) return <Car size={size} />;
    if (l.includes('bus')) return <Bus size={size} />;
    if (l.includes('walk')) return <Map size={size} />;
    return <MapPin size={size} />;
  }

  const map: Record<string, React.ReactNode> = { 
    flight: <Plane size={size} />, 
    train: <Train size={size} />, 
    bus: <Bus size={size} />, 
    cab: <Car size={size} />, 
    hotel: <Hotel size={size} />
  };
  return map[t] ?? <MapPin size={size} />;
}
