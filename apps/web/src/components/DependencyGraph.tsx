import React, { useState } from 'react';
import type { Node, Edge } from '../types';
import { CascadeImpactPanel } from './CascadeImpactPanel';
import { Zap, X } from 'lucide-react';

interface DependencyGraphProps {
  nodes: Node[];
  edges?: Edge[];
  animating?: boolean;
  /** tripId needed by WhatIfNodeAction to call impact-simulate */
  tripId?: string;
}

function safeStr(val: unknown, fallback = ''): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'object') return (val as any)?.value ?? fallback;
  return String(val);
}

const getEmoji = (type: string) => {
  switch(type?.toLowerCase()) {
    case 'flight': return '✈️';
    case 'train': return '🚆';
    case 'cab': case 'bus': return '🚕';
    case 'hotel': return '🏨';
    case 'restaurant': return '🍽️';
    case 'activity': return '🏝️';
    default: return '📌';
  }
}

export function DependencyGraph({ nodes, edges = [], animating, tripId }: DependencyGraphProps) {
  const [whatIfNode, setWhatIfNode] = useState<{ id: string; label: string; type: string } | null>(null);

  if (!nodes || nodes.length === 0) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-20 px-4 text-center rounded-[20px] border border-dashed border-gray-200 bg-[#FBFBFB]">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
          <span className="text-xl opacity-40">🗺️</span>
        </div>
        <h4 className="font-bold text-gray-700 mb-1">Canvas Empty</h4>
        <p className="text-xs text-gray-500 max-w-[250px]">Your horizontal execution DAG will appear here once bookings are added.</p>
      </div>
    );
  }
  
  return (
    <div className="w-full flex flex-col gap-4">
      {/* Legend & Subtitle */}
      <div className="flex justify-between items-center px-1">
        <div className="text-gray-500 font-medium text-[13px] flex items-center gap-1.5">
          <span className="font-bold text-teal-800 flex items-center gap-1">
            <span className="text-lg leading-none">→</span> Horizontal Execution DAG
          </span>
          <span className="opacity-60">·</span>
          <span>Left-to-right propagation flow</span>
        </div>
        <div className="flex gap-4 text-gray-500 font-medium text-[13px]">
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#62A86B]" /> Confirmed</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#E5A43F]" /> At Risk / Pending</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#E45B4D]" /> Disrupted</div>
        </div>
      </div>

      {/* Dotted Container */}
      <div 
        className="pt-12 pb-40 px-8 rounded-[20px] border border-gray-100 flex overflow-x-auto items-center [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        style={{ 
          backgroundColor: '#FDFDFD',
          backgroundImage: 'radial-gradient(#E2E8F0 1.5px, transparent 1.5px)',
          backgroundSize: '24px 24px',
          backgroundPosition: '0 0',
          scrollBehavior: 'smooth' 
        }}
      >
        {nodes.map((node: any, i: number) => {
          const label = safeStr(node.label, node.type ?? 'Node');
          const status = safeStr(node.status, 'unknown').toLowerCase();
          const type = safeStr(node.type, 'unknown');
          const nodeId = node.id || node._id;
          
          const nextNode = nodes[i + 1];
          const nextNodeId = nextNode ? ((nextNode as any).id || (nextNode as any)._id) : undefined;
          const edge = edges.find((e: any) => e.from === nodeId && e.to === nextNodeId);
          const hasEdge = !!nextNodeId;
          
          const isBroken = status === 'broken' || status === 'disrupted';
          const isAtRisk = status === 'at_risk' || status === 'pending';
          
          const cardBorder = isBroken ? 'border-[#E45B4D]' : isAtRisk ? 'border-[#E5A43F]' : 'border-[#62A86B]';
          const dotColor = isBroken ? 'bg-[#E45B4D]' : isAtRisk ? 'bg-[#E5A43F]' : 'bg-[#62A86B]';
          const pulseClass = animating && isBroken ? 'animate-pulse' : '';

          // Mock constraints based on type to match design
          const isHard = type === 'flight' || type === 'train' || type === 'cab';
          const constraintBadge = isHard ? (
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#FDECEA] text-[#D93829] tracking-wide">HARD</span>
          ) : (
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#E8F0E2] text-[#4E8752] tracking-wide">SOFT</span>
          );
          
          // Slack/Buffer to match real data
          const bufferText = (edge as any)?.buffer ? `${(edge as any).buffer}m buffer` : hasEdge ? (isHard ? '180m buffer' : '60m buffer') : '';
          const slack = (edge as any)?.buffer ? (edge as any).buffer + ((edge as any).paddingMin || 0) : 0;
          const slackText = hasEdge ? (slack > 0 ? `${slack}m buf` : '0m slack') : '';

          return (
            <React.Fragment key={nodeId || i}>
              {/* Node Card */}
              <div 
                className={`group relative flex flex-col p-4 bg-white border-2 rounded-2xl shadow-sm min-w-[210px] max-w-[240px] transition-all hover:-translate-y-1 z-10 ${cardBorder} ${pulseClass} hover:shadow-md cursor-default`}
              >
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl leading-none">{getEmoji(type)}</span>
                    {constraintBadge}
                  </div>
                  <div className={`w-3 h-3 rounded-full shadow-sm ${dotColor}`} />
                </div>
                
                <span className="font-bold text-[16px] text-[#172017] truncate mb-5">{label}</span>
                
                <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="opacity-70">⏱</span>
                    <span>{node.time ? (isNaN(new Date(node.time).getTime()) ? String(node.time) : new Date(node.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) : '--:--'}</span>
                  </div>
                  <span className="opacity-70">{slackText}</span>
                </div>

                {/* Hover Details Tooltip — pointer-events enabled so WhatIf button is clickable */}
                <div className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+14px)] w-[240px] bg-white border border-gray-100 rounded-[14px] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.2)] opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 translate-y-3 transition-all duration-300 z-50 p-4">
                  {/* Little upward triangle pointer */}
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-l border-t border-gray-100 rotate-45" />
                  
                  <div className="relative z-10 flex flex-col gap-2.5">
                    {node.vendor && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400 font-medium">Vendor</span>
                        <span className="font-bold text-gray-800">{node.vendor}</span>
                      </div>
                    )}
                    {node.location && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400 font-medium">Location</span>
                        <span className="font-bold text-gray-800 truncate max-w-[100px] text-right" title={node.location}>{node.location}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400 font-medium">Trust Level</span>
                      <span className="font-bold text-[#62A86B] capitalize">{node.trustLevel || 'High'}</span>
                    </div>
                    {!!node.delay && node.delay > 0 && (
                      <div className="flex justify-between items-center text-xs mt-1 pt-2.5 border-t border-gray-100">
                        <span className="text-[#E45B4D] font-bold">Delay detected</span>
                        <span className="font-extrabold text-[#E45B4D] bg-[#FDECEA] px-2 py-0.5 rounded text-[10px]">+{node.delay}m</span>
                      </div>
                    )}
                    {/* D2: "What if?" action — dry-run impact simulation */}
                    {tripId && nodeId && (
                      <div className="pt-2 border-t border-gray-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setWhatIfNode({ id: String(nodeId), label, type });
                          }}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all hover:scale-105 cursor-pointer"
                          style={{ background: '#172017', color: '#C5D82D' }}
                          title="What if this booking is disrupted?"
                        >
                          <Zap size={11} />
                          What if?
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Edge Connection */}
              {i < nodes.length - 1 && (
                <div className="flex items-center justify-center relative -mx-0.5 z-0 w-20 flex-shrink-0">
                  <div className={`w-full h-[2px] ${isBroken && animating ? 'animate-pulse bg-[#E45B4D]' : 'bg-[#62A86B]'}`} />
                  <span className={`absolute -top-5 text-[11px] font-bold whitespace-nowrap ${isBroken && animating ? 'text-[#E45B4D]' : 'text-[#62A86B]'}`}>
                    {bufferText}
                  </span>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {whatIfNode && (
        <div className="mt-2 bg-white border border-gray-200 rounded-[20px] shadow-sm p-6 overflow-hidden animate-slide-up">
          <CascadeImpactPanel
            tripId={tripId!}
            targetNode={whatIfNode}
            onClose={() => setWhatIfNode(null)}
          />
        </div>
      )}
    </div>
  );
}
