import type { EventLogEntry } from '../types';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';

interface EventTimelineProps {
  events: EventLogEntry[];
  compact?: boolean;
}

export function EventTimeline({ events, compact = false }: EventTimelineProps) {
  const iconMap: Record<string, React.ReactNode> = {
    info: <Info size={10} style={{ color: '#172017' }} />,
    warning: <AlertTriangle size={10} style={{ color: '#E5A43F' }} />,
    success: <CheckCircle size={10} style={{ color: '#2E7D32' }} />,
    error: <XCircle size={10} style={{ color: '#D93829' }} />,
  };

  const dotColor: Record<string, string> = {
    info: '#172017',
    warning: '#E5A43F',
    success: '#2E7D32',
    error: '#D93829',
  };

  if (compact) {
    return (
      <div className="flex flex-col gap-3">
        {events.map((event, i) => {
          const t = event.type as string;
          const msg = event.payload?.message as string || 'Event logged';
          return (
            <div key={event.id || i} className="flex gap-2.5 items-start">
              <div className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ background: dotColor[t] || dotColor.info }} />
              <div>
                <p className="text-xs font-semibold leading-snug" style={{ color: '#172017' }}>{msg}</p>
                <p className="text-[10px] mt-0.5" style={{ color: '#5F665B' }}>{event.ts ? new Date(event.ts).toLocaleTimeString() : ''}</p>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="card p-6" style={{ background: '#FFFFFF', borderColor: '#D5D9CC' }}>
      <h3 className="font-bold mb-5" style={{ color: '#172017' }}>Event History</h3>
      <div className="relative pl-7">
        <div className="absolute left-2 top-0 bottom-0 w-0.5" style={{ background: 'linear-gradient(to bottom, #172017 0%, #D5D9CC 100%)' }} />
        <div className="flex flex-col gap-4">
          {events.map((event, i) => {
            const t = event.type as string;
            const msg = event.payload?.message as string || 'Event logged';
            return (
              <div key={event.id || i} className="relative animate-slide-up" style={{ animationDelay: `${i * 0.08}s` }}>
                <div className="absolute -left-8 top-2 w-4 h-4 rounded-full flex items-center justify-center bg-white border" style={{ borderColor: dotColor[t] || dotColor.info }}>
                  {iconMap[t] || iconMap.info}
                </div>
                <div className="pl-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold" style={{ color: '#5F665B', fontFamily: 'monospace' }}>{event.ts ? new Date(event.ts).toLocaleTimeString() : ''}</span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: '#172017' }}>{msg}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
