import type { Node, Edge } from '../types';
import { Share, MapPin, Clock } from 'lucide-react';
import { StatusBadge, NodeIcon } from './StatusBadge';

export function TripTimeline({ nodes, isDisrupted }: { nodes: Node[], isDisrupted: boolean }) {
  return (
    <div className="relative">
      <div className="absolute left-[19px] top-4 bottom-0 w-0.5 bg-gray-200" />
      <div className="flex flex-col gap-0">
        {nodes.map((node, i) => (
          <div key={node.id || i} className="relative flex gap-4 pb-6">
            <div className="w-10 flex-shrink-0 flex items-start justify-center pt-1 z-10">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-base border-2 bg-white"
                style={{
                  borderColor: node.status === 'confirmed' || node.status === 'on_track' ? '#62A86B' 
                  : node.status === 'at_risk' ? '#E7A943' 
                  : '#E45B4D',
                }}
              >
                <NodeIcon type={node.type} />
              </div>
            </div>

            <div className="flex-1 mt-1">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-bold text-gray-900 leading-snug">{node.label}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={node.status} />
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-semibold text-gray-900">
                    {node.time ? (isNaN(new Date(node.time).getTime()) ? node.time : new Date(node.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) : ''}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
